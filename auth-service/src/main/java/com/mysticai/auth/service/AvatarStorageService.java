package com.mysticai.auth.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class AvatarStorageService {

    private static final long MAX_AVATAR_BYTES = 5L * 1024L * 1024L;

    @Value("${storage.local.path:./uploads}")
    private String basePath;

    private Path storagePath;

    @PostConstruct
    public void init() {
        this.storagePath = Paths.get(basePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(storagePath.resolve("avatars"));
            log.info("Avatar storage initialized at {}", storagePath);
        } catch (IOException ex) {
            throw new RuntimeException("Could not initialize avatar storage", ex);
        }
    }

    public StoredAvatar store(Long userId, MultipartFile avatar) {
        validateImage(avatar);

        String extension = resolveExtension(avatar);
        String fileName = UUID.randomUUID() + extension;
        Path targetDirectory = storagePath
                .resolve("avatars")
                .resolve(String.valueOf(userId))
                .resolve(LocalDate.now().toString())
                .normalize();
        ensureInsideStorage(targetDirectory);

        try {
            Files.createDirectories(targetDirectory);
            Path targetPath = targetDirectory.resolve(fileName).normalize();
            ensureInsideStorage(targetPath);

            try (InputStream inputStream = avatar.getInputStream()) {
                Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
            }

            String relativePath = storagePath.relativize(targetPath).toString().replace('\\', '/');
            String contentType = normalizedContentType(avatar.getContentType())
                    .orElseGet(() -> detectContentType(targetPath));

            return new StoredAvatar(relativePath, contentType);
        } catch (IOException ex) {
            log.error("Failed to store avatar for user {}", userId, ex);
            throw new RuntimeException("Failed to store avatar", ex);
        }
    }

    public Optional<StoredAvatarContent> read(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return Optional.empty();
        }

        Path targetPath = storagePath.resolve(relativePath).normalize();
        if (!isInsideStorage(targetPath) || !Files.exists(targetPath)) {
            return Optional.empty();
        }

        try {
            Resource resource = new UrlResource(targetPath.toUri());
            if (!resource.exists()) {
                return Optional.empty();
            }
            String contentType = detectContentType(targetPath);
            long size = Files.size(targetPath);
            return Optional.of(new StoredAvatarContent(resource, contentType, size));
        } catch (IOException ex) {
            log.warn("Failed to read avatar {}", relativePath, ex);
            return Optional.empty();
        }
    }

    public boolean delete(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return false;
        }

        Path targetPath = storagePath.resolve(relativePath).normalize();
        if (!isInsideStorage(targetPath)) {
            log.warn("Attempted to delete avatar outside storage: {}", relativePath);
            return false;
        }

        try {
            return Files.deleteIfExists(targetPath);
        } catch (IOException ex) {
            log.warn("Failed to delete avatar {}", relativePath, ex);
            return false;
        }
    }

    private void validateImage(MultipartFile avatar) {
        if (avatar == null || avatar.isEmpty()) {
            throw new IllegalArgumentException("Avatar file cannot be empty");
        }

        if (avatar.getSize() > MAX_AVATAR_BYTES) {
            throw new IllegalArgumentException("Avatar file size cannot exceed 5MB");
        }

        String contentType = normalizedContentType(avatar.getContentType())
                .orElseThrow(() -> new IllegalArgumentException("Avatar content type is required"));
        if (!contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Avatar must be an image file");
        }
    }

    private String resolveExtension(MultipartFile avatar) {
        String extensionFromName = sanitizeExtension(extractExtension(avatar.getOriginalFilename()));
        if (!extensionFromName.isBlank()) {
            return extensionFromName;
        }

        String contentType = normalizedContentType(avatar.getContentType()).orElse("");
        return switch (contentType) {
            case MediaType.IMAGE_JPEG_VALUE -> ".jpg";
            case MediaType.IMAGE_PNG_VALUE -> ".png";
            case "image/webp" -> ".webp";
            case "image/heic" -> ".heic";
            case "image/heif" -> ".heif";
            default -> "";
        };
    }

    private String detectContentType(Path path) {
        try {
            String detected = Files.probeContentType(path);
            if (detected != null && !detected.isBlank()) {
                return detected;
            }
        } catch (IOException ex) {
            log.debug("Could not probe content type for {}", path, ex);
        }

        String name = path.getFileName() != null ? path.getFileName().toString().toLowerCase(Locale.ROOT) : "";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG_VALUE;
        }
        if (name.endsWith(".png")) {
            return MediaType.IMAGE_PNG_VALUE;
        }
        if (name.endsWith(".webp")) {
            return "image/webp";
        }
        if (name.endsWith(".heic")) {
            return "image/heic";
        }
        if (name.endsWith(".heif")) {
            return "image/heif";
        }
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    private Optional<String> normalizedContentType(String value) {
        if (value == null) {
            return Optional.empty();
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.isBlank() ? Optional.empty() : Optional.of(normalized);
    }

    private String extractExtension(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "";
        }
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0 || lastDot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(lastDot);
    }

    private String sanitizeExtension(String extension) {
        if (extension == null || extension.isBlank()) {
            return "";
        }
        String normalized = extension.trim().toLowerCase(Locale.ROOT);
        if (!normalized.startsWith(".")) {
            normalized = "." + normalized;
        }
        return normalized.matches("\\.[a-z0-9]{1,10}") ? normalized : "";
    }

    private void ensureInsideStorage(Path path) {
        if (!isInsideStorage(path)) {
            throw new IllegalArgumentException("Invalid avatar path");
        }
    }

    private boolean isInsideStorage(Path path) {
        return path.startsWith(storagePath);
    }

    public record StoredAvatar(String relativePath, String contentType) {}

    public record StoredAvatarContent(Resource resource, String contentType, long contentLength) {}
}
