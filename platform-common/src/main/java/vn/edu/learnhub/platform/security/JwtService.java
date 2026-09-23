// path: platform-common/src/main/java/vn/edu/learnhub/platform/security/JwtService.java
// purpose: sinh va doc JWT. Theo file cong nghe loi: Access Token song ngan (30 phut),
// Refresh Token song dai (7 ngay) va duoc luu ban bam trong DB de thu hoi duoc.
// identity-service dung ca sinh + doc; cac service khac CHI doc (tu xac thuc token - Zero Trust).

package vn.edu.learnhub.platform.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtService {

    public static final String CLAIM_USER_ID = "userId";
    public static final String CLAIM_ROLE = "role";
    public static final String CLAIM_TYPE = "type";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-expiration-ms:1800000}")
    private long accessExpirationMs;

    @Value("${jwt.refresh-expiration-ms:604800000}")
    private long refreshExpirationMs;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId, String username, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(username)
                .claim(CLAIM_USER_ID, userId)
                .claim(CLAIM_ROLE, role)
                .claim(CLAIM_TYPE, TYPE_ACCESS)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessExpirationMs))
                .signWith(key())
                .compact();
    }

    /**
     * Refresh token mang theo jti de identity-service luu lai va thu hoi duoc khi logout/doi mat khau.
     */
    public String generateRefreshToken(Long userId, String username, String jti) {
        Date now = new Date();
        return Jwts.builder()
                .id(jti)
                .subject(username)
                .claim(CLAIM_USER_ID, userId)
                .claim(CLAIM_TYPE, TYPE_REFRESH)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshExpirationMs))
                .signWith(key())
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public static String newJti() {
        return UUID.randomUUID().toString();
    }

    public long getAccessExpirationMs() {
        return accessExpirationMs;
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }
}
