package vn.edu.learnhub.content.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quiz_question")
public class QuizQuestion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "quiz_id", nullable = false) private Long quizId;
    @Column(nullable = false, columnDefinition = "TEXT") private String prompt;
    @Column(name = "option_a", nullable = false, length = 300) private String optionA;
    @Column(name = "option_b", nullable = false, length = 300) private String optionB;
    @Column(name = "option_c", length = 300) private String optionC;
    @Column(name = "option_d", length = 300) private String optionD;
    @Column(name = "correct_option", nullable = false, length = 1) private String correctOption;

    public Long getId() { return id; }
    public Long getQuizId() { return quizId; }
    public void setQuizId(Long quizId) { this.quizId = quizId; }
    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }
    public String getOptionA() { return optionA; }
    public void setOptionA(String optionA) { this.optionA = optionA; }
    public String getOptionB() { return optionB; }
    public void setOptionB(String optionB) { this.optionB = optionB; }
    public String getOptionC() { return optionC; }
    public void setOptionC(String optionC) { this.optionC = optionC; }
    public String getOptionD() { return optionD; }
    public void setOptionD(String optionD) { this.optionD = optionD; }
    public String getCorrectOption() { return correctOption; }
    public void setCorrectOption(String correctOption) { this.correctOption = correctOption; }
}
