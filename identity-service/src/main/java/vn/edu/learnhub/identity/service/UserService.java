package vn.edu.learnhub.identity.service;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.identity.dto.UserDtos;
import vn.edu.learnhub.identity.entity.AppUser;
import vn.edu.learnhub.identity.entity.EmailOutbox;
import vn.edu.learnhub.identity.repository.AppUserRepository;
import vn.edu.learnhub.identity.repository.EmailOutboxRepository;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.util.List;

@Service
public class UserService {

    private final AppUserRepository userRepository;
    private final EmailOutboxRepository emailOutboxRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final AccountMailService accountMailService;

    public UserService(AppUserRepository userRepository,
                       EmailOutboxRepository emailOutboxRepository,
                       PasswordEncoder passwordEncoder,
                       AuthService authService,
                       AccountMailService accountMailService) {
        this.userRepository = userRepository;
        this.emailOutboxRepository = emailOutboxRepository;
        this.passwordEncoder = passwordEncoder;
        this.authService = authService;
        this.accountMailService = accountMailService;
    }

    public UserDtos.UserDTO getById(Long id) {
        return toDto(findUser(id));
    }

    public UserDtos.PublicUserDTO getPublicById(Long id) {
        AppUser user = findUser(id);
        return new UserDtos.PublicUserDTO(user.getId(), user.getFullName(),
                user.getHeadline(), user.getAvatarUrl(), user.getRole());
    }

    public UserDtos.PublicUserDTO getPublicByEmail(String email) {
        AppUser user = userRepository.findByEmailIgnoreCase(email == null ? "" : email.trim())
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay nguoi dung voi email nay"));
        return new UserDtos.PublicUserDTO(user.getId(), user.getFullName(),
                user.getHeadline(), user.getAvatarUrl(), user.getRole());
    }

    public List<UserDtos.PublicUserDTO> getPublicByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return userRepository.findByIdIn(ids).stream()
                .map(user -> new UserDtos.PublicUserDTO(user.getId(), user.getFullName(),
                        user.getHeadline(), user.getAvatarUrl(), user.getRole()))
                .toList();
    }

    public Page<UserDtos.UserDTO> search(String keyword, Pageable pageable) {
        Page<AppUser> page = (keyword == null || keyword.isBlank())
                ? userRepository.findAll(pageable)
                : userRepository.findByFullNameContainingIgnoreCaseOrUsernameContainingIgnoreCase(
                keyword, keyword, pageable);
        return page.map(this::toDto);
    }

    public UserDtos.AdminStatsDTO adminStats() {
        return new UserDtos.AdminStatsDTO(
                userRepository.count(),
                userRepository.countByRole(Roles.STUDENT),
                userRepository.countByRole(Roles.INSTRUCTOR),
                userRepository.countByRole(Roles.ADMIN),
                userRepository.countByRole(Roles.ORG_ADMIN),
                userRepository.countByLocked(true));
    }

    public Page<UserDtos.MailLogDTO> mailLog(Pageable pageable) {
        return emailOutboxRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toMailDto);
    }

    public byte[] exportExcel() {
        List<AppUser> users = userRepository.findAll();
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Tai khoan");
            String[] headers = {"ID", "Ten dang nhap", "Email", "Ho ten", "Vai tro", "Khoa", "Ly do khoa", "Ngay tao"};
            Row head = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                head.createCell(i).setCellValue(headers[i]);
            }
            int rowIdx = 1;
            for (AppUser user : users) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(user.getId());
                row.createCell(1).setCellValue(user.getUsername());
                row.createCell(2).setCellValue(user.getEmail());
                row.createCell(3).setCellValue(user.getFullName());
                row.createCell(4).setCellValue(user.getRole());
                row.createCell(5).setCellValue(user.isLocked() ? "Khoa" : "Hoat dong");
                row.createCell(6).setCellValue(user.getLockReason() == null ? "" : user.getLockReason());
                row.createCell(7).setCellValue(user.getCreatedAt() == null ? "" : user.getCreatedAt().toString());
            }
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw BusinessException.badRequest("Khong xuat duoc Excel tai khoan");
        }
    }

    @Transactional
    public UserDtos.UserDTO updateProfile(Long userId, UserDtos.UpdateProfileRequest request) {
        AppUser user = findUser(userId);
        user.setFullName(request.fullName().trim());
        user.setHeadline(request.headline());
        user.setBio(request.bio());
        user.setAvatarUrl(request.avatarUrl());
        if (request.language() != null && !request.language().isBlank()) {
            user.setLanguage(request.language());
        }
        return toDto(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, UserDtos.ChangePasswordRequest request) {
        AppUser user = findUser(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw BusinessException.badRequest("Mat khau hien tai khong dung");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        authService.revokeAllTokens(userId);
    }

    @Transactional
    public UserDtos.UserDTO updateRole(Long userId, String role) {
        String normalized = role.trim().toUpperCase();
        if (!Roles.ALL.contains(normalized)) {
            throw BusinessException.badRequest("Vai tro khong hop le");
        }
        AppUser user = findUser(userId);
        user.setRole(normalized);
        userRepository.save(user);
        authService.revokeAllTokens(userId);
        return toDto(user);
    }

    @Transactional
    public UserDtos.UserDTO setLocked(Long userId, boolean locked, String reason) {
        Long adminId = CurrentUser.requireId();
        if (adminId.equals(userId)) {
            throw BusinessException.badRequest("Ban khong the khoa tai khoan cua chinh minh");
        }
        AppUser user = findUser(userId);
        if (locked) {
            String trimmed = reason == null ? "" : reason.trim();
            if (trimmed.length() < 10) {
                throw BusinessException.badRequest("Phai nhap ly do khoa tai khoan (toi thieu 10 ky tu) de gui email");
            }
            user.setLocked(true);
            user.setLockReason(trimmed);
            user.setLockedAt(Instant.now());
            user.setLockedBy(adminId);
            user.setUnlockedAt(null);
            userRepository.save(user);
            authService.revokeAllTokens(userId);
            String adminName = userRepository.findById(adminId).map(AppUser::getFullName).orElse("Quan tri vien");
            accountMailService.sendLockNotice(user, trimmed, adminName);
        } else {
            user.setLocked(false);
            user.setUnlockedAt(Instant.now());
            userRepository.save(user);
            accountMailService.sendUnlockNotice(user);
        }
        return toDto(user);
    }

    private AppUser findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay nguoi dung"));
    }

    private UserDtos.UserDTO toDto(AppUser user) {
        return new UserDtos.UserDTO(user.getId(), user.getUsername(), user.getEmail(),
                user.getFullName(), user.getRole(), user.isLocked(), user.getLockReason(),
                user.getLockedAt(), user.getLockedBy(), user.getHeadline(),
                user.getBio(), user.getAvatarUrl(), user.getLanguage(), user.getCreatedAt());
    }

    private UserDtos.MailLogDTO toMailDto(EmailOutbox mail) {
        return new UserDtos.MailLogDTO(mail.getId(), mail.getRecipient(), mail.getSubject(),
                mail.getBody(), mail.getStatus(), mail.getErrorMessage(),
                mail.getRelatedUserId(), mail.getCreatedAt());
    }
}
