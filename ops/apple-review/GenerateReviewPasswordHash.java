import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.regex.Pattern;

public final class GenerateReviewPasswordHash {
    private static final Pattern STRONG_PASSWORD =
            Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$");

    private GenerateReviewPasswordHash() {
    }

    public static void main(String[] args) {
        String password = System.getenv("REVIEW_PASSWORD");
        if ((password == null || password.isBlank()) && args.length > 0) {
            password = args[0];
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Set REVIEW_PASSWORD or pass the password as the first argument.");
        }
        if (!STRONG_PASSWORD.matcher(password).matches()) {
            throw new IllegalArgumentException("Password does not satisfy auth-service strong password policy.");
        }

        System.out.println(new BCryptPasswordEncoder().encode(password));
    }
}
