package com.mysticai.vision.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Optional;

/**
 * Storage Service Interface - Görsel dosyalarının depolanması için abstraction.
 * 
 * Şu an için lokal dosya sistemi implementasyonu kullanılmaktadır.
 * Gelecekte S3, MinIO veya Azure Blob Storage geçişi için hazır yapı.
 */
public interface StorageService {

    /**
     * Dosya yükle ve URL döndür.
     * 
     * @param file Yüklenecek dosya
     * @param directory Hedef dizin (örn: "coffee", "palm")
     * @return Kaydedilen dosyanın erişim URL'si
     */
    String store(MultipartFile file, String directory);

    /**
     * Dosya yükle ve metadata ile birlikte kaydet.
     * 
     * @param file Yüklenecek dosya
     * @param directory Hedef dizin
     * @param fileName Özel dosya adı (null ise otomatik üretilir)
     * @return StorageResult içinde URL ve path bilgisi
     */
    StorageResult storeWithMetadata(MultipartFile file, String directory, String fileName);

    /**
     * Dosyayı sil.
     * 
     * @param filePath Silinecek dosyanın path'i
     * @return Başarılı ise true
     */
    boolean delete(String filePath);

    /**
     * Dosyayı getir.
     * 
     * @param filePath Dosya path'i
     * @return InputStream veya empty
     */
    Optional<InputStream> get(String filePath);

    /**
     * Dosyanın var olup olmadığını kontrol et.
     * 
     * @param filePath Dosya path'i
     * @return Varsa true
     */
    boolean exists(String filePath);

    /**
     * Dosya URL'sini oluştur.
     * 
     * @param filePath Dosya path'i
     * @return Tam URL
     */
    String getUrl(String filePath);

    /**
     * Storage sonucu - URL ve path bilgisi içerir.
     */
    record StorageResult(String url, String path, long size, String contentType) {}
}
