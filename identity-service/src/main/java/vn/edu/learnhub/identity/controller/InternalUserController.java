// path: identity-service/src/main/java/vn/edu/learnhub/identity/controller/InternalUserController.java
// purpose: API NOI BO (Buoi 3) cho service khac lay ten/anh nguoi dung de hien thi,
// vi du social-service can ten hoc vien dat cau hoi. Khong lo ra Gateway, can X-Internal-Key.

package vn.edu.learnhub.identity.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.learnhub.identity.dto.UserDtos;
import vn.edu.learnhub.identity.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/internal/users")
public class InternalUserController {

    private final UserService userService;

    public InternalUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public UserDtos.PublicUserDTO getUser(@PathVariable Long id) {
        return userService.getPublicById(id);
    }

    @GetMapping("/by-email")
    public UserDtos.PublicUserDTO getUserByEmail(@RequestParam String email) {
        return userService.getPublicByEmail(email);
    }

    @PostMapping("/bulk")
    public List<UserDtos.PublicUserDTO> getUsers(@RequestBody List<Long> ids) {
        return userService.getPublicByIds(ids);
    }
}
