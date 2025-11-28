package com.studybuddy.Controller;

import com.studybuddy.Dto.Studyflow.*;
import com.studybuddy.Dto.Studyflow.Question.QuestionGetDto;
import com.studybuddy.Dto.Studyflow.Question.QuestionPostDto;
import com.studybuddy.Service.Studyflow.*;
import com.studybuddy.Service.Studyflow.Indicator.GenerateIndicatorService;
import com.studybuddy.Service.Studyflow.Overview.GenerateOverviewService;
import com.studybuddy.Service.Studyflow.Question.GenerateQuestionsService;
import com.studybuddy.Service.Studyflow.Question.GetQuestionsByStudyflowId;
import com.studybuddy.Service.Studyflow.Question.PostAnswerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("api/studyflow")
@CrossOrigin(origins = "http://localhost:4200")
public class StudyflowController {

    private static final String ERROR_PREFIX = "erro: ";

    private final StudyflowCreatorService studyflowCreatorService;
    private final GetQuestionsByStudyflowId getQuestionsByStudyflowId;
    private final PostAnswerService postAnswerService;
    private final GenerateIndicatorService generateIndicatorService;
    private final GetAllStudyflows getAllStudyflows;
    private final GenerateQuestionsService generateQuestionsService;
    private final StudyflowPatchService studyflowPatchService;
    private final AccumulateTimeService accumulateTimeService;
    private final GetStudyflowStatus getStudyflowStatus;
    private final GetStudyflowService getStudyflowService;
    private final GenerateOverviewService generateOverviewService;

    public record ApiResponse<T>(String message, T data) {}

    public StudyflowController(StudyflowCreatorService studyflowCreatorService, GetQuestionsByStudyflowId getQuestionsByStudyflowId, PostAnswerService postAnswerService, GenerateIndicatorService generateIndicatorService, GetAllStudyflows getAllStudyflows, GenerateQuestionsService generateQuestionsService, StudyflowPatchService studyflowPatchService, AccumulateTimeService accumulateTimeService, GetStudyflowStatus getStudyflowStatus, GetStudyflowService getStudyflowService, GenerateOverviewService generateOverviewService) {
        this.studyflowCreatorService = studyflowCreatorService;
        this.getQuestionsByStudyflowId = getQuestionsByStudyflowId;
        this.postAnswerService = postAnswerService;
        this.generateIndicatorService = generateIndicatorService;
        this.getAllStudyflows = getAllStudyflows;
        this.generateQuestionsService = generateQuestionsService;
        this.studyflowPatchService = studyflowPatchService;
        this.accumulateTimeService = accumulateTimeService;
        this.getStudyflowStatus = getStudyflowStatus;
        this.getStudyflowService = getStudyflowService;
        this.generateOverviewService = generateOverviewService;
    }

    @GetMapping
    public ResponseEntity<List<StudyflowGetDto>> getAllStudyFlows(@RequestParam UUID studentId) {
        try {
            return ResponseEntity.status(HttpStatus.OK).body(getAllStudyflows.get(studentId));
        } catch (Exception e){
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/overview")
    @CrossOrigin(origins = "http://localhost:4200")
    public ResponseEntity<ApiResponse<byte[]>> getOverview(@RequestParam UUID id) {
        try {
            return ResponseEntity.status(HttpStatus.OK).body(new ApiResponse<>("Overview", generateOverviewService.returnPdf(id)));
        }
        catch (Exception e){
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PatchMapping("/questions")
    public ResponseEntity<ApiResponse<String>> answerQuestion(@RequestBody QuestionPostDto questionPostDto) {
        try{
            postAnswerService.postAnswer(questionPostDto);
            return ResponseEntity.status(HttpStatus.OK).body(new ApiResponse<>("Respondido", null));
        } catch (Exception e){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/byId")
    ResponseEntity<StudyflowFullDto> getFullStudyflowDto(@RequestParam UUID studyflowId) {
        try{
            return ResponseEntity.status(HttpStatus.OK).body(getStudyflowService.get(studyflowId));
        } catch (Exception e){
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @PostMapping("/time")
    ResponseEntity<String> postTimeSpent(@RequestBody StudyflowTimeDto studyflowTimeDto){
        System.out.println(studyflowTimeDto);
        try {
            accumulateTimeService.accumulateTime(studyflowTimeDto);
            return ResponseEntity.status(HttpStatus.OK).body("Respondido");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ERROR_PREFIX + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Object> postStudyFlow(@RequestBody StudyflowPostDto studyflowPostDto) {
        try {
            UUID studyflowId = studyflowCreatorService.create(studyflowPostDto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>("Studyflow criado com sucesso", studyflowId));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ERROR_PREFIX + e.getMessage());
        }
    }

    @PatchMapping
    public ResponseEntity<String> editStudyFlow(@RequestBody StudyflowPatchDto studyflowPatchDto) {
        try{
            studyflowPatchService.patch(studyflowPatchDto);
            return  ResponseEntity.status(HttpStatus.OK).body("Patched");
        } catch(Exception e){
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ERROR_PREFIX + e.getMessage());
        }
    }

    @GetMapping("/questions")
    public ResponseEntity<List<QuestionGetDto>> getAllQuestions(@RequestParam UUID studyflowId) {
        try {
            List<QuestionGetDto> result = getQuestionsByStudyflowId.get(studyflowId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.emptyList());
        }
    }

    @PostMapping("/generate")
    public ResponseEntity<Object> generateQuestionsTrigger(@RequestBody UUID studyflowId) {
        try {
            generateQuestionsService.generate(studyflowId);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>("Questoes geradas", studyflowId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ERROR_PREFIX + e.getMessage());
        }
    }

    @GetMapping("/status")
    public ResponseEntity<StudyflowStatusDto> getStudyflowStatus(@RequestParam UUID studyflowId){
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(getStudyflowStatus.get(studyflowId));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }
}