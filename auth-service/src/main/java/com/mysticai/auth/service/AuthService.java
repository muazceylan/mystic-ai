package com.mysticai.auth.service;

import com.mysticai.auth.dto.*;
import com.mysticai.auth.entity.User;
import com.mysticai.auth.repository.UserRepository;
import com.mysticai.auth.security.JwtTokenProvider;
import com.mysticai.auth.security.SocialTokenVerifier;
import com.mysticai.auth.security.SocialTokenVerifier.SocialUserInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final SocialTokenVerifier socialTokenVerifier;

    @Transactional
    public UserDTO register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new IllegalArgumentException("Username already exists");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already exists");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .firstName(request.firstName())
                .lastName(request.lastName())
                .name(request.firstName() + " " + request.lastName())
                .birthDate(request.birthDate())
                .birthTime(request.birthTime())
                .birthLocation(request.birthLocation())
                .birthCountry(request.birthCountry())
                .birthCity(request.birthCity())
                .birthTimeUnknown(request.birthTimeUnknown())
                .timezone(request.timezone())
                .gender(request.gender())
                .maritalStatus(request.maritalStatus())
                .focusPoint(request.focusPoint())
                .zodiacSign(request.zodiacSign())
                .roles(Set.of("USER"))
                .enabled(true)
                .build();

        User savedUser = userRepository.save(user);
        return toUserDTO(savedUser);
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        String accessToken = jwtTokenProvider.generateAccessToken(authentication);
        String refreshToken = jwtTokenProvider.generateRefreshToken(authentication);

        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return new LoginResponse(
                accessToken,
                refreshToken,
                jwtTokenProvider.getJwtExpiration(),
                toUserDTO(user)
        );
    }

    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }

    @Transactional
    public LoginResponse socialLogin(SocialLoginRequest request) {
        SocialUserInfo userInfo;
        switch (request.provider().toLowerCase()) {
            case "google" -> userInfo = socialTokenVerifier.verifyGoogleToken(request.idToken());
            case "apple" -> userInfo = socialTokenVerifier.verifyAppleToken(request.idToken());
            default -> throw new IllegalArgumentException("Unsupported provider: " + request.provider());
        }

        String provider = request.provider().toLowerCase();

        // Check if user already exists with this social provider
        Optional<User> existingUser = userRepository.findByProviderAndSocialId(provider, userInfo.socialId());

        if (existingUser.isPresent()) {
            // Returning user
            User user = existingUser.get();
            String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
            String refreshToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
            return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(user), false);
        }

        // Check if email already exists (email user upgrading to social)
        if (userInfo.email() != null) {
            Optional<User> emailUser = userRepository.findByEmail(userInfo.email());
            if (emailUser.isPresent()) {
                User user = emailUser.get();
                user.setProvider(provider);
                user.setSocialId(userInfo.socialId());
                userRepository.save(user);
                String accessToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
                String refreshToken = jwtTokenProvider.generateToken(user.getId(), user.getUsername(), user.getEmail());
                return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(user), false);
            }
        }

        // New user — create minimal account
        String email = userInfo.email() != null ? userInfo.email() : (userInfo.socialId() + "@" + provider + ".social");
        String username = email.toLowerCase();

        // Ensure unique username
        if (userRepository.existsByUsername(username)) {
            username = provider + "_" + userInfo.socialId();
        }

        User newUser = User.builder()
                .username(username)
                .email(email)
                .password(null)
                .provider(provider)
                .socialId(userInfo.socialId())
                .firstName(userInfo.firstName())
                .lastName(userInfo.lastName())
                .name(buildName(userInfo.firstName(), userInfo.lastName()))
                .roles(Set.of("USER"))
                .enabled(true)
                .build();

        User savedUser = userRepository.save(newUser);
        String accessToken = jwtTokenProvider.generateToken(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail());
        String refreshToken = jwtTokenProvider.generateToken(savedUser.getId(), savedUser.getUsername(), savedUser.getEmail());
        return new LoginResponse(accessToken, refreshToken, jwtTokenProvider.getJwtExpiration(), toUserDTO(savedUser), true);
    }

    @Transactional
    public UserDTO updateProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.firstName() != null) user.setFirstName(request.firstName());
        if (request.lastName() != null) user.setLastName(request.lastName());
        if (request.firstName() != null || request.lastName() != null) {
            user.setName(buildName(
                    request.firstName() != null ? request.firstName() : user.getFirstName(),
                    request.lastName() != null ? request.lastName() : user.getLastName()
            ));
        }
        if (request.birthDate() != null) user.setBirthDate(request.birthDate());
        if (request.birthTime() != null) user.setBirthTime(request.birthTime());
        if (request.birthLocation() != null) user.setBirthLocation(request.birthLocation());
        if (request.birthCountry() != null) user.setBirthCountry(request.birthCountry());
        if (request.birthCity() != null) user.setBirthCity(request.birthCity());
        if (request.birthTimeUnknown() != null) user.setBirthTimeUnknown(request.birthTimeUnknown());
        if (request.timezone() != null) user.setTimezone(request.timezone());
        if (request.gender() != null) user.setGender(request.gender());
        if (request.maritalStatus() != null) user.setMaritalStatus(request.maritalStatus());
        if (request.focusPoint() != null) user.setFocusPoint(request.focusPoint());
        if (request.zodiacSign() != null) user.setZodiacSign(request.zodiacSign());

        User saved = userRepository.save(user);
        return toUserDTO(saved);
    }

    private String buildName(String firstName, String lastName) {
        if (firstName == null && lastName == null) return null;
        if (firstName == null) return lastName;
        if (lastName == null) return firstName;
        return firstName + " " + lastName;
    }

    private UserDTO toUserDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .name(user.getName())
                .birthDate(user.getBirthDate())
                .birthTime(user.getBirthTime())
                .birthLocation(user.getBirthLocation())
                .birthCountry(user.getBirthCountry())
                .birthCity(user.getBirthCity())
                .birthTimeUnknown(user.getBirthTimeUnknown())
                .timezone(user.getTimezone())
                .gender(user.getGender())
                .maritalStatus(user.getMaritalStatus())
                .focusPoint(user.getFocusPoint())
                .zodiacSign(user.getZodiacSign())
                .roles(user.getRoles())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
