package vn.edu.learnhub.content.service;

import io.minio.*;
import io.minio.http.Method;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.learnhub.platform.exception.BusinessException;

import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Phân hệ Quản lý Nội dung & Lưu trữ MinIO
 * Sinh viên thực hiện: Lâm Thu Thùy (thuy1411 - 2311060387@hunre.edu.vn)
 */
@Service
public class MinioStorageService {

    private static final Logger log = LoggerFactory.getLogger(MinioStorageService.class);

    private final MinioClient minioClient;
    private final String bucketName;

    public MinioStorageService(
            @Value("${minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${minio.access-key:learnhub}") String accessKey,
            @Value("${minio.secret-key:learnhub123}") String secretKey,
            @Value("${minio.bucket:learnhub-content}") String bucketName
    ) {
        this.bucketName = bucketName;
        this.minioClient = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
        initBucket();
    }

    private void initBucket() {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("Da tao bucket MinIO thanh cong: {}", bucketName);
            }
        } catch (Exception e) {
            log.warn("Chua the ket noi toi MinIO bucket (se khoi tao khi can): {}", e.getMessage());
        }
    }

    public String uploadFile(MultipartFile file, String folder) {
        try {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
            String extension = "";
            int dotIdx = originalName.lastIndexOf('.');
            if (dotIdx > 0) {
                extension = originalName.substring(dotIdx);
            }
            String objectName = folder + "/" + UUID.randomUUID() + extension;

            try (InputStream is = file.getInputStream()) {
                minioClient.putObject(
                        PutObjectArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .stream(is, file.getSize(), -1)
                                .contentType(file.getContentType())
                                .build()
                );
            }
            log.info("Upload file len MinIO thanh cong: objectName={}", objectName);
            return objectName;
        } catch (Exception e) {
            log.error("Loi khi upload file len MinIO: {}", e.getMessage(), e);
            throw BusinessException.badRequest("Loi khi upload tep len MinIO: " + e.getMessage());
        }
    }

    public String getPresignedUrl(String objectName) {
        try {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucketName)
                            .object(objectName)
                            .expiry(2, TimeUnit.HOURS)
                            .build()
            );
        } catch (Exception e) {
            log.warn("Khong the tao presigned URL cho object {}: {}", objectName, e.getMessage());
            return "/api/content/media/" + objectName;
        }
    }

    public String getBucketName() {
        return bucketName;
    }
}
