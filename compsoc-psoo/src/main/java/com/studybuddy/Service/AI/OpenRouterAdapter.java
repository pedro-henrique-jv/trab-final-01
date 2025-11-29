package com.studybuddy.Service.AI;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.Exception.AiProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class OpenRouterAdapter implements AiChatClient {
    private static final Logger log = LoggerFactory.getLogger(OpenRouterAdapter.class);
    private static final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private static final int TIMEOUT_SECONDS = 120;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;

    public OpenRouterAdapter(@Value("${openrouter.api.key}") String apiKey) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
        this.apiKey = apiKey;

        if (this.apiKey == null || this.apiKey.isBlank()) {
            throw new IllegalStateException("OPENROUTER_API_KEY environment variable is not set");
        }
    }

    @Override
    public AiResponse sendRequest(AiRequest request) {
        try {
            log.debug("Sending request to OpenRouter API with model: {}", request.getModel());
            
            Map<String, Object> body = buildRequestBody(request);
            String jsonBody = objectMapper.writeValueAsString(body);
            System.out.println(jsonBody);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(OPENROUTER_URL))
                    .timeout(Duration.ofSeconds(TIMEOUT_SECONDS))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() / 100 != 2) {
                log.error("OpenRouter API error: {} - {}", response.statusCode(), response.body());
                throw new AiProviderException(
                    String.format("OpenRouter API returned status %d: %s", response.statusCode(), response.body())
                );
            }

            String content = extractContentFromResponse(response.body());
            log.debug("Received response from OpenRouter API, content length: {}", content.length());
            
            return new AiResponse(content, response.statusCode(), response.body());

        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to communicate with OpenRouter API", e);
            throw new AiProviderException("Failed to communicate with OpenRouter API", e);
        }
    }

    private Map<String, Object> buildRequestBody(AiRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", request.getModel());
        
        List<Map<String, String>> messages = request.getMessages().stream()
                .map(msg -> Map.of("role", msg.getRole(), "content", msg.getContent()))
                .collect(Collectors.toList());
        
        body.put("messages", messages);
        body.put("temperature", request.getTemperature());
        body.put("max_tokens", request.getMaxTokens());
        
        return body;
    }

    private String extractContentFromResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);

            if (!root.has("choices") || !root.path("choices").isArray() || root.path("choices").size() == 0) {
                log.error("Response missing choices array or array is empty");
                throw new AiProviderException("Invalid response structure from OpenRouter");
            }

            JsonNode firstChoice = root.path("choices").get(0);
            JsonNode messageNode = firstChoice.path("message");

            String content = messageNode.path("content").asText("");

            if (content.isEmpty()) {
                content = messageNode.path("reasoning").asText("");
                log.debug("Content was empty, extracted from 'reasoning' field instead");
            }

            if (content.isEmpty()) {
                content = firstChoice.path("text").asText("");
                log.debug("Content and reasoning were empty, tried 'text' field");
            }

            if (content.isEmpty()) {
                log.error("All content extraction attempts failed");
                log.error("Full response: {}", responseBody);
                throw new AiProviderException("No content found in any expected field");
            }

            log.debug("Successfully extracted content, length: {}", content.length());
            return content;

        } catch (AiProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse OpenRouter response", e);
            throw new AiProviderException("Failed to parse OpenRouter response", e);
        }
    }
}
