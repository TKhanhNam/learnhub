// path: platform-common/src/main/java/vn/edu/learnhub/platform/security/PlatformSecurityConfig.java
// purpose: cau hinh Spring Security dung chung cho 8 service.
// - Stateless, tat form login/CSRF vi day la REST API
// - KHONG cau hinh CORS o day: CORS chi dat o Gateway (nguyen tac Buoi 4)
// - Phan quyen chi tiet dat ngay tren method bang @PreAuthorize (RBAC), con ABAC dung CurrentUser

package vn.edu.learnhub.platform.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class PlatformSecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        // BCrypt theo yeu cau file cong nghe loi (khang GPU, co salt ngau nhien)
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   JwtAuthFilter jwtAuthFilter,
                                                   InternalKeyFilter internalKeyFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .addFilterBefore(internalKeyFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
