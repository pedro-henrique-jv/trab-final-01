package com.studybuddy.Service.Studyflow.Question;

import com.fasterxml.jackson.databind.JsonNode;
import com.studybuddy.Exception.EntityNotFoundException;
import com.studybuddy.Repository.Studyflow.QuestionEntityRepository;
import com.studybuddy.Repository.Studyflow.StudyflowEntityRepository;
import com.studybuddy.Service.AI.AiChatClient;
import com.studybuddy.Service.AI.AiRequest;
import com.studybuddy.Service.AI.Strategy.PromptContext;
import com.studybuddy.Service.AI.Strategy.PromptStrategy;
import com.studybuddy.Service.AI.Strategy.QuestionGenerationPromptStrategy;
import com.studybuddy.Service.AI.Template.AbstractAiGenerationService;
import com.studybuddy.Service.Extractor.ExtractTextFromResources;
import com.studybuddy.entity.QuestionEntity;
import com.studybuddy.entity.QuestionType;
import com.studybuddy.entity.StudyflowEntity;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class GenerateQuestionsServiceImpl extends AbstractAiGenerationService<List<QuestionEntity>> 
        implements GenerateQuestionsService {

    private static final String ANSWERS_FIELD = "answers";
    private static final String TAGS_FIELD = "tags";

    private final ExtractTextFromResources extractTextFromResources;
    private final StudyflowEntityRepository studyflowEntityRepository;
    private final QuestionEntityRepository questionEntityRepository;
    private final QuestionGenerationPromptStrategy questionStrategy;

    public GenerateQuestionsServiceImpl(
            AiChatClient aiChatClient,
            ExtractTextFromResources extractTextFromResources,
            StudyflowEntityRepository studyflowEntityRepository,
            QuestionEntityRepository questionEntityRepository,
            QuestionGenerationPromptStrategy questionStrategy) {
        super(aiChatClient);
        this.extractTextFromResources = extractTextFromResources;
        this.studyflowEntityRepository = studyflowEntityRepository;
        this.questionEntityRepository = questionEntityRepository;
        this.questionStrategy = questionStrategy;
    }

    @Override
    protected PromptContext gatherContext(UUID studyflowId) {
        log.debug("Gathering context for question generation, studyflow: {}", studyflowId);
        
        List<String> resourceContents = extractTextFromResources.getTextFromAllResources(studyflowId);
        List<String> indicatorTags = extractTextFromResources.getProcessedIndicatorTags(studyflowId);
        
        return PromptContext.builder()
                .resourceContents(resourceContents)
                .existingIndicators(indicatorTags)
                .build();
    }

    @Override
    protected PromptStrategy selectPromptStrategy(PromptContext context) {
        log.debug("Using question generation strategy");
        return questionStrategy;
    }

    @Override
    protected AiRequest buildAiRequest(String promptContent) {
        return AiRequest.builder()
                .addSystemMessage(getSystemPrompt())
                .addUserMessage(promptContent)
                .temperature(getTemperature())
                .maxTokens(8000)
                .build();
    }

    @Override
    protected List<QuestionEntity> mapResponseToData(JsonNode parsedContent) {
        log.debug("Mapping response to question entities");
        
        List<QuestionEntity> questions = new ArrayList<>();
        
        for (JsonNode questionNode : parsedContent) {
            QuestionEntity entity = createQuestionEntity(questionNode);
            questions.add(entity);
        }
        
        log.debug("Mapped {} questions from AI response", questions.size());
        return questions;
    }

    @Override
    protected void persistResults(UUID studyflowId, List<QuestionEntity> questions) {
        log.debug("Persisting {} questions for studyflow: {}", questions.size(), studyflowId);
        
        StudyflowEntity studyflow = studyflowEntityRepository.findById(studyflowId)
                .orElseThrow(() -> new EntityNotFoundException("Studyflow", studyflowId.toString()));
        
        questions.forEach(question -> {
            question.setStudyFlow(studyflow);
            question.setAnswered(false);
            question.setUserAnswer(null);
            questionEntityRepository.save(question);
        });
        
        log.info("Successfully saved {} questions for studyflow: {}", questions.size(), studyflowId);
    }

    private QuestionEntity createQuestionEntity(JsonNode questionNode) {
        QuestionEntity entity = new QuestionEntity();
        
        entity.setType(parseQuestionType(questionNode.path("type").asText("SHORT_ANSWER")));
        entity.setQuestion(questionNode.path("question").asText(""));
        entity.setExpectedAnswer(questionNode.path("expectedAnswer").asText(""));
        entity.setAnswers(parseAnswers(questionNode));
        entity.setTags(parseTags(questionNode));
        
        return entity;
    }

    private QuestionType parseQuestionType(String typeString) {
        try {
            return QuestionType.valueOf(typeString);
        } catch (Exception e) {
            log.warn("Invalid question type: {}, defaulting to SHORT_ANSWER", typeString);
            return QuestionType.SHORT_ANSWER;
        }
    }

    private String parseAnswers(JsonNode questionNode) {
        List<String> answers = new ArrayList<>();
        
        if (questionNode.has(ANSWERS_FIELD) && questionNode.get(ANSWERS_FIELD).isArray()) {
            for (JsonNode answerNode : questionNode.get(ANSWERS_FIELD)) {
                answers.add(answerNode.asText());
            }
        }
        
        return answers.toString();
    }

    private String parseTags(JsonNode questionNode) {
        if (questionNode.has(TAGS_FIELD) && questionNode.get(TAGS_FIELD).isArray()) {
            List<String> tags = new ArrayList<>();
            for (JsonNode tagNode : questionNode.get(TAGS_FIELD)) {
                tags.add(tagNode.asText());
            }
            return String.join(",", tags);
        } else {
            return questionNode.path(TAGS_FIELD).asText("");
        }
    }

    @Override
    protected int getMaxTokens() {
        return 8000;
    }
}