package vn.edu.learnhub.org.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.learnhub.org.dto.OrgDtos;
import vn.edu.learnhub.org.entity.DemoRequest;
import vn.edu.learnhub.org.entity.LearningPath;
import vn.edu.learnhub.org.entity.OrgMember;
import vn.edu.learnhub.org.entity.Organization;
import vn.edu.learnhub.org.repository.DemoRequestRepository;
import vn.edu.learnhub.org.repository.LearningPathRepository;
import vn.edu.learnhub.org.repository.OrgMemberRepository;
import vn.edu.learnhub.org.repository.OrganizationRepository;
import vn.edu.learnhub.platform.client.ServiceClient;
import vn.edu.learnhub.platform.error.BusinessException;
import vn.edu.learnhub.platform.security.AuthUser;
import vn.edu.learnhub.platform.security.CurrentUser;

import java.util.Arrays;
import java.util.List;

@Service
public class OrgService {
    private final OrganizationRepository organizationRepository;
    private final OrgMemberRepository memberRepository;
    private final LearningPathRepository pathRepository;
    private final DemoRequestRepository demoRequestRepository;
    private final ServiceClient serviceClient;
    private final String learningUrl;

    public OrgService(OrganizationRepository organizationRepository,
                      OrgMemberRepository memberRepository,
                      LearningPathRepository pathRepository,
                      DemoRequestRepository demoRequestRepository,
                      ServiceClient serviceClient,
                      @Value("${services.learning-internal-url}") String learningUrl) {
        this.organizationRepository = organizationRepository;
        this.memberRepository = memberRepository;
        this.pathRepository = pathRepository;
        this.demoRequestRepository = demoRequestRepository;
        this.serviceClient = serviceClient;
        this.learningUrl = learningUrl;
    }

    public List<OrgDtos.PlanDTO> plans() {
        return List.of(
                new OrgDtos.PlanDTO("TEAM", "Nhóm nhỏ", 20, "Liên hệ"),
                new OrgDtos.PlanDTO("BUSINESS", "Doanh nghiệp", 100, "Liên hệ"),
                new OrgDtos.PlanDTO("ENTERPRISE", "Tập đoàn", 1000, "Liên hệ")
        );
    }

    @Transactional
    public OrgDtos.DemoDTO requestDemo(OrgDtos.DemoRequestBody request) {
        DemoRequest demo = new DemoRequest();
        demo.setCompany(request.company().trim());
        demo.setContactEmail(request.contactEmail().trim());
        demo.setMessage(request.message());
        demo = demoRequestRepository.save(demo);
        return new OrgDtos.DemoDTO(demo.getId(), demo.getCompany(), demo.getContactEmail(),
                demo.getMessage(), demo.getStatus(), demo.getCreatedAt());
    }

    @Transactional
    public OrgDtos.OrgDTO createOrg(Long ownerId, OrgDtos.CreateOrgRequest request) {
        Organization org = new Organization();
        org.setName(request.name().trim());
        org.setPlan(request.plan() == null || request.plan().isBlank() ? "TEAM" : request.plan());
        org.setOwnerId(ownerId);
        org.setSeatLimit("ENTERPRISE".equals(org.getPlan()) ? 1000 : "BUSINESS".equals(org.getPlan()) ? 100 : 20);
        org = organizationRepository.save(org);
        OrgMember owner = new OrgMember();
        owner.setOrgId(org.getId());
        owner.setUserId(ownerId);
        owner.setRole("ADMIN");
        memberRepository.save(owner);
        return toDto(org);
    }

    public OrgDtos.OrgDTO myOrg(Long userId) {
        Organization org = organizationRepository.findFirstByOwnerId(userId)
                .orElseThrow(() -> BusinessException.notFound("Ban chua tao to chuc"));
        return toDto(org);
    }

    public List<OrgDtos.MemberDTO> members(Long orgId) {
        requireOrgAdmin(orgId);
        return memberRepository.findByOrgId(orgId).stream()
                .map(m -> new OrgDtos.MemberDTO(m.getId(), m.getUserId(), m.getRole())).toList();
    }

    @Transactional
    public OrgDtos.MemberDTO addMember(Long orgId, OrgDtos.MemberRequest request) {
        Organization org = requireOrgAdmin(orgId);
        if (memberRepository.countByOrgId(orgId) >= org.getSeatLimit()) {
            throw BusinessException.conflict("Da het cho ngoi cua goi hien tai");
        }
        if (memberRepository.existsByOrgIdAndUserId(orgId, request.userId())) {
            throw BusinessException.conflict("Nhan su da co trong to chuc");
        }
        OrgMember member = new OrgMember();
        member.setOrgId(orgId);
        member.setUserId(request.userId());
        member.setRole(request.role() == null ? "LEARNER" : request.role());
        member = memberRepository.save(member);
        return new OrgDtos.MemberDTO(member.getId(), member.getUserId(), member.getRole());
    }

    @Transactional
    public OrgDtos.PathDTO addPath(Long orgId, OrgDtos.PathRequest request) {
        requireOrgAdmin(orgId);
        LearningPath path = new LearningPath();
        path.setOrgId(orgId);
        path.setTitle(request.title().trim());
        path.setCourseIds(request.courseIds().stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse(""));
        path = pathRepository.save(path);
        return toPath(path);
    }

    public List<OrgDtos.PathDTO> paths(Long orgId) {
        requireOrgAdmin(orgId);
        return pathRepository.findByOrgId(orgId).stream().map(this::toPath).toList();
    }

    public void assignCourse(Long orgId, OrgDtos.AssignRequest request) {
        requireOrgAdmin(orgId);
        if (!memberRepository.existsByOrgIdAndUserId(orgId, request.userId())) {
            throw BusinessException.badRequest("Nguoi dung khong thuoc to chuc");
        }
        serviceClient.post("learning", learningUrl + "/internal/enrollments/grant",
                new OrgDtos.GrantRequest(request.userId(), request.courseId(), "ORG", null), Object.class);
    }

    public OrgDtos.ReportDTO report(Long orgId) {
        requireOrgAdmin(orgId);
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay to chuc"));
        return new OrgDtos.ReportDTO(memberRepository.countByOrgId(orgId),
                pathRepository.findByOrgId(orgId).size(), org.getPlan());
    }

    public List<OrgDtos.DemoDTO> adminDemos() {
        return demoRequestRepository.findAll().stream()
                .map(d -> new OrgDtos.DemoDTO(d.getId(), d.getCompany(), d.getContactEmail(),
                        d.getMessage(), d.getStatus(), d.getCreatedAt())).toList();
    }

    private Organization requireOrgAdmin(Long orgId) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> BusinessException.notFound("Khong tim thay to chuc"));
        AuthUser user = CurrentUser.require();
        if (user.isAdmin() || org.getOwnerId().equals(user.userId())) {
            return org;
        }
        throw BusinessException.forbidden("Chi quan tri to chuc duoc thao tac");
    }

    private OrgDtos.OrgDTO toDto(Organization org) {
        return new OrgDtos.OrgDTO(org.getId(), org.getName(), org.getPlan(), org.getSeatLimit(),
                memberRepository.countByOrgId(org.getId()), org.getOwnerId());
    }

    private OrgDtos.PathDTO toPath(LearningPath path) {
        List<Long> ids = path.getCourseIds().isBlank() ? List.of()
                : Arrays.stream(path.getCourseIds().split(",")).map(Long::valueOf).toList();
        return new OrgDtos.PathDTO(path.getId(), path.getTitle(), ids);
    }
}
