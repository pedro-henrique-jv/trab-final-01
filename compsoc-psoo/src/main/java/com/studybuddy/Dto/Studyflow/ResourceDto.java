package com.studybuddy.Dto.Studyflow;

import java.util.UUID;

public class ResourceDto {
    private byte[] binary;
    private String mime;
    private String filename;
    private UUID studyflowId;
    private boolean indicator;

    public ResourceDto() {
        // Construtor vazio necessário para frameworks de serialização (como Jackson)
    }

    public boolean isIndicator() {
        return indicator;
    }

    public void setIndicator(boolean indicator) {
        this.indicator = indicator;
    }

    public byte[] getBinary() { return binary; }
    public void setBinary(byte[] binary) { this.binary = binary; }

    public String getMime() { return mime; }
    public void setMime(String mime) { this.mime = mime; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public UUID getStudyflowId() { return studyflowId; }
    public void setStudyflowId(UUID studyflowId) { this.studyflowId = studyflowId; }
}