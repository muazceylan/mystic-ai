package com.mysticai.vision.service;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;

/**
 * Local Storage Service Implementation - Dosyaları lokal dosya sistemine kaydeder.
 * 
 * S3/MinIO geçişine hazır yapı - StorageService interface'ini implement eder.
 */
@Service
@Slf4j
public class LocalStorageService implements StorageService {

    @Value("${storage.local.path:./uploads}")
    private String basePath;

    @Value("${storage.local.url-prefix:http://localhost:8089/uploads}")
    private String urlPrefix;

    private Path storagePath;

    @PostConstruct
    public void init() {
        this.storagePath = Paths.get(basePath).toAbsolutePath().normalize();
        try {
            Files.createDirectories(storagePath);
            log.info("Local storage initialized at: {}", storagePath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create storage directory", e);
        }
    }

    @Override
    public String store(MultipartFile file, String directory) {
        return storeWithMetadata(file, directory, null).url();
    }

    @Override
    public StorageResult storeWithMetadata(MultipartFile file, String directory, String fileName) {
        try {
            // Validate file
            if (file.isEmpty()) {
                throw new IllegalArgumentException("Cannot store empty file");
            }

            // Generate unique filename if not provided
            String originalFilename = file.getOriginalFilename();
            String extension = getFileExtension(originalFilename);
            String targetFileName = fileName != null ? fileName : UUID.randomUUID().toString() + extension;

            // Create directory structure
            Path targetDirectory = storagePath.resolve(directory);
            Files.createDirectories(targetDirectory);

            // Create subdirectory based on date for better organization
            String dateSubdir = java.time.LocalDate.now().toString();
            targetDirectory = targetDirectory.resolve(dateSubdir);
            Files.createDirectories(targetDirectory);

            // Store file
            Path targetPath = targetDirectory.resolve(targetFileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Generate relative path for storage
            String relativePath = directory + "/" + dateSubdir + "/" + targetFileName;
            String url = urlPrefix + "/" + relativePath;

            log.info("File stored successfully: {} ({} bytes)", relativePath, file.getSize());

            return new StorageResult(url, relativePath, file.getSize(), file.getContentType());

        } catch (IOException e) {
            log.error("Failed to store file", e);
            throw new RuntimeException("Failed to store file", e);
        }
    }

    @Override
    public boolean delete(String filePath) {
        try {
            Path path = storagePath.resolve(filePath).normalize();
            // Security check - ensure path is within storage directory
            if (!path.startsWith(storagePath)) {
                log.warn("Attempted to delete file outside storage directory: {}", filePath);
                return false;
            }
            return Files.deleteIfExists(path);
        } catch (IOException e) {
            log.error("Failed to delete file: {}", filePath, e);
            return false;
        }
    }

    @Override
    public Optional<InputStream> get(String filePath) {
        try {
            Path path = storagePath.resolve(filePath).normalize();
            // Security check
            if (!path.startsWith(storagePath)) {
                log.warn("Attempted to access file outside storage directory: {}", filePath);
                return Optional.empty();
            }
            if (Files.exists(path)) {
                return Optional.of(Files.newInputStream(path));
            }
        } catch (IOException e) {
            log.error("Failed to read file: {}", filePath, e);
        }
        return Optional.empty();
    }

    @Override
    public boolean exists(String filePath) {
        Path path = storagePath.resolve(filePath).normalize();
        if (!path.startsWith(storagePath)) {
            return false;
        }
        return Files.exists(path);
    }

    @Override
    public String getUrl(String filePath) {
        return urlPrefix + "/" + filePath;
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf("."));
    }
}
