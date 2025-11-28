package com.studybuddy.Service.Extractor;

import com.studybuddy.Exception.GenericException;
import com.studybuddy.Repository.Studyflow.Indicator.IndicatorEntityRepository;
import com.studybuddy.Repository.Studyflow.Resource.ResourceEntityRepository;
import com.studybuddy.entity.IndicatorEntity;
import com.studybuddy.entity.ResourceEntity;
import com.studybuddy.entity.StudyflowEntity;
import com.studybuddy.Repository.Studyflow.StudyflowEntityRepository;
import jakarta.transaction.Transactional;
import org.apache.tika.Tika;
import org.apache.tika.metadata.Metadata;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ExtractTextFromResources {
    private static final String FILE_MARKER = "=== FILE: ";

    private final ResourceEntityRepository resourceEntityRepository;
    private final StudyflowEntityRepository studyflowEntityRepository;
    private final IndicatorEntityRepository indicatorEntityRepository;

    ExtractTextFromResources(ResourceEntityRepository resourceEntityRepository, StudyflowEntityRepository studyflowEntityRepository, IndicatorEntityRepository indicatorEntityRepository) {
        this.resourceEntityRepository = resourceEntityRepository;
        this.studyflowEntityRepository = studyflowEntityRepository;
        this.indicatorEntityRepository = indicatorEntityRepository;
    }

    @Transactional
    public List<String> getTextFromAllResources(UUID studyflowId){
        Tika tika = new Tika();

        List<String> resourceText = new ArrayList<>();
        StringBuilder allText = new StringBuilder();
        List<ResourceEntity> resourceEntityList = new ArrayList<>(resourceEntityRepository.findAllByStudyFlowId(studyflowId));
        Optional<StudyflowEntity> studyflowEntityOptional = studyflowEntityRepository.findById(studyflowId);

        if(studyflowEntityOptional.isEmpty()){
            throw new GenericException("studyflow nao encontreado");
        }
        StudyflowEntity studyflowEntity = studyflowEntityOptional.get();

        ResourceEntity indicator = studyflowEntity.getIndicator();
        if (indicator != null) {
            UUID indicatorId = indicator.getId();
            resourceEntityList.removeIf(re -> re != null && indicatorId != null && indicatorId.equals(re.getId()));
        }

        resourceEntityList.forEach(resourceEntity -> {
            try (InputStream stream = new ByteArrayInputStream(resourceEntity.getFileData())) {
                Metadata metadata = new Metadata();
                String text = tika.parseToString(stream, metadata);

                allText.append(FILE_MARKER).append(resourceEntity.getFilename()).append(" ===\n");
                allText.append(text).append("\n\n");
            } catch (Exception e) {
                allText.append(FILE_MARKER).append(resourceEntity.getFilename())
                        .append(" (FAILED TO PARSE) ===\n\n");
                e.printStackTrace();
            }
            resourceText.add(allText.toString());
        });
        return resourceText;
    }

    public String getIndicatorText(UUID studyflowId){
        Tika tika = new Tika();
        StringBuilder resourceText = new StringBuilder();
        Optional<StudyflowEntity> studyflowEntityOptional = studyflowEntityRepository.findById(studyflowId);
        ResourceEntity indicator;
        if (studyflowEntityOptional.isPresent()){
            indicator = studyflowEntityOptional.get().getIndicator();
        }
        else return null;
        if (indicator == null){
            return null;
        }
        try (InputStream stream = new ByteArrayInputStream(indicator.getFileData())) {
            Metadata metadata = new Metadata();
            String text = tika.parseToString(stream, metadata);

            resourceText.append(FILE_MARKER).append(indicator.getFilename()).append(" ===\n");
            resourceText.append(text).append("\n\n");
        } catch (Exception e) {
            resourceText.append(FILE_MARKER).append(indicator.getFilename())
                    .append(" (FAILED TO PARSE) ===\n\n");
            e.printStackTrace();
        }
        return resourceText.toString();
    }

    public List<String> getProcessedIndicatorTags(UUID studyflowId){
        List<IndicatorEntity> indicatorEntityList = indicatorEntityRepository.findAllByStudyflowId(studyflowId);
        if (indicatorEntityList.isEmpty()){
            throw new GenericException("tags indicadoras nao cadastradas");
        }
        List<String> indicatorTags = new ArrayList<>();
        for (IndicatorEntity indicatorEntity : indicatorEntityList){
            indicatorTags.add(indicatorEntity.getIndicatorTag());
        }
        return indicatorTags;
    }
}