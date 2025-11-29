package com.studybuddy.Service.Studyflow.Overview;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.studybuddy.Exception.AiProviderException;
import com.studybuddy.Repository.Studyflow.Resource.ResourceEntityRepository;
import com.studybuddy.entity.ResourceEntity;
import com.studybuddy.Exception.ResourceProcessingException;
import com.studybuddy.Service.AI.AiChatClient;
import com.studybuddy.Service.AI.Strategy.OverviewFromResourcesPromptStrategy;
import com.studybuddy.Service.AI.Strategy.PromptContext;
import com.studybuddy.Service.AI.Strategy.PromptStrategy;
import com.studybuddy.Service.AI.Template.AbstractAiGenerationService;
import com.studybuddy.Service.Extractor.ExtractTextFromResources;
import com.studybuddy.Service.Studyflow.Resource.GetResourceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GenerateOverviewServiceImpl extends AbstractAiGenerationService<String> implements GenerateOverviewService {

    private final Logger log = LoggerFactory.getLogger(GenerateOverviewServiceImpl.class);

    private static final String OVERVIEW_FILENAME = "ZPECIAL_FILE_PERZIZTED_MARKDOWN_2340UE9EH90";

    private final GetResourceService resourceService;
    private final PromptStrategy overviewStrategy;
    private final ExtractTextFromResources extractTextFromResources;
    private final ResourceEntityRepository resourceEntityRepository;

    public GenerateOverviewServiceImpl(
            AiChatClient aiChatClient,
            GetResourceService resourceService,
            OverviewFromResourcesPromptStrategy overviewStrategy,
            ExtractTextFromResources extractTextFromResources,
            ResourceEntityRepository resourceEntityRepository) {
        super(aiChatClient);
        this.resourceService = resourceService;
        this.overviewStrategy = overviewStrategy;
        this.extractTextFromResources = extractTextFromResources;
        this.resourceEntityRepository = resourceEntityRepository;
    }

    @Override
    protected PromptContext gatherContext(UUID studyflowId) {
        log.debug("Gathering context for overview generation, studyflow: {}", studyflowId);

        List<String> resourceContents = extractTextFromResources.getTextFromAllResources(studyflowId);
        List<String> indicatorTags = extractTextFromResources.getProcessedIndicatorTags(studyflowId);

        return PromptContext.builder()
                .resourceContents(resourceContents)
                .existingIndicators(indicatorTags)
                .build();
    }

    @Override
    protected PromptStrategy selectPromptStrategy(PromptContext context) {
        return overviewStrategy;
    }

    @Override
    protected JsonNode parseResponse(String content) {
        log.debug("Received markdown overview, length: {}", content.length());
        ObjectNode node = objectMapper.createObjectNode();
        node.put("markdown", content.trim());
        return node;
    }

    @Override
    protected String mapResponseToData(JsonNode parsedContent) {
        if (parsedContent == null || !parsedContent.has("markdown")) {
            throw new AiProviderException("Parsed content missing markdown field");
        }

        String markdown = parsedContent.get("markdown").asText();
        if (!StringUtils.hasText(markdown)) {
            throw new ResourceProcessingException("Empty markdown response from AI");
        }

        return markdown;
    }

    @Override
    protected void persistResults(UUID studyflowId, String data) {
        if (data == null) {
            throw new ResourceProcessingException("Cannot persist null overview");
        }

        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);

        ResourceEntity resourceEntity = new ResourceEntity();
        resourceEntity.setFilename(OVERVIEW_FILENAME);
        resourceEntity.setFileData(bytes);
        resourceEntity.setStudyFlowId(studyflowId);
        resourceEntity.setMimeType("text/markdown");
        resourceEntity.setSizeBytes(bytes.length);
        resourceEntityRepository.save(resourceEntity);

        log.info("Persisted overview resource for studyflow {} (filename={})", studyflowId, OVERVIEW_FILENAME);
    }

    @Override
    @Transactional
    public byte[] returnPdf(UUID studyflowId) {
        return generateAndReturnPdf(studyflowId);
    }

    private byte[] generateAndReturnPdf(UUID studyflowId) {
        Optional<ResourceEntity> maybe = resourceEntityRepository.findByStudyFlowIdAndFilename(studyflowId, OVERVIEW_FILENAME);
        if (maybe.isPresent()) {
            log.info("Overview already exists for studyflow {} — skipping AI call", studyflowId);
            return markdownResourceToPdf(maybe.get());
        }

        log.info("Overview not found for studyflow {} — invoking AI generation", studyflowId);
        super.generate(studyflowId);

        ResourceEntity generated = resourceEntityRepository.findByStudyFlowIdAndFilename(studyflowId, OVERVIEW_FILENAME)
                .orElseThrow(() -> new ResourceProcessingException("Overview was not persisted after AI generation for studyflow " + studyflowId));

        return markdownResourceToPdf(generated);
    }

    private byte[] markdownResourceToPdf(ResourceEntity resourceEntity) {
        if (resourceEntity == null || resourceEntity.getFileData() == null || resourceEntity.getFileData().length == 0) {
            throw new ResourceProcessingException("No markdown content available to convert to PDF");
        }

        String markdown = new String(resourceEntity.getFileData(), StandardCharsets.UTF_8);
        if (!StringUtils.hasText(markdown)) {
            throw new ResourceProcessingException("Markdown is empty");
        }

        try {
            MutableDataSet options = new MutableDataSet();
            Parser parser = Parser.builder(options).build();
            HtmlRenderer renderer = HtmlRenderer.builder(options).build();
            com.vladsch.flexmark.util.ast.Node document = parser.parse(markdown);
            String htmlBody = renderer.render(document);

            String htmlWrapped = "<!DOCTYPE html>\n" +
                    "<html>\n" +
                    "<head>\n" +
                    "<meta charset=\"UTF-8\"/>\n" +
                    "<style>\n" +
                    "body { font-family: 'DejaVu Sans', Arial, sans-serif; font-size: 12pt; margin: 20px; }\n" +
                    "h1, h2, h3 { page-break-after: avoid; }\n" +
                    "pre { white-space: pre-wrap; background: #f5f5f5; padding: 10px; }\n" +
                    "code { background: #f5f5f5; padding: 2px 4px; }\n" +
                    "</style>\n" +
                    "</head>\n" +
                    "<body>\n" +
                    htmlBody +
                    "\n</body>\n" +
                    "</html>";

            try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
                PdfRendererBuilder builder = new PdfRendererBuilder();
                builder.withHtmlContent(htmlWrapped, null);
                builder.toStream(os);
                builder.run();
                return os.toByteArray();
            }

        } catch (Exception e) {
            log.error("Failed to convert markdown resource to PDF", e);
            throw new ResourceProcessingException("Failed to convert markdown to PDF", e);
        }
    }

    @Override
    protected String getSystemPrompt() {
        return "Você é um assistente que deve responder APENAS com o documento em MARKDOWN solicitado pelo usuário. "
                + "Nada além do Markdown do overview.";
    }

    @Override
    protected double getTemperature() {
        return 0.2;
    }
}