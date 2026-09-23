INSERT INTO quiz (course_id, title, kind, pass_score)
SELECT c.id, 'Practice test - On thi', 'PRACTICE', 80
FROM (
  SELECT 1 AS id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) c
WHERE EXISTS (SELECT 1 FROM lecture l WHERE l.course_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM quiz q WHERE q.kind = 'PRACTICE' AND q.course_id = c.id);

INSERT INTO quiz_question (quiz_id, prompt, option_a, option_b, option_c, option_d, correct_option)
SELECT q.id,
       'Ban can hoan thanh bai nao truoc khi lam practice test?',
       'Khong can bai nao',
       'Cac bai giang va quiz trong khoa',
       'Chi xem trailer',
       'Chi doc review',
       'B'
FROM quiz q
WHERE q.kind = 'PRACTICE'
  AND NOT EXISTS (SELECT 1 FROM quiz_question qq WHERE qq.quiz_id = q.id);

INSERT INTO assignment (course_id, title, instruction)
SELECT c.id, 'Coding exercise - nop link GitHub',
       'Lam bai tap lap trinh, day len GitHub (public) roi dan link repository.'
FROM (
  SELECT 1 AS id UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) c
WHERE EXISTS (SELECT 1 FROM lecture l WHERE l.course_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM assignment a WHERE a.course_id = c.id AND a.title LIKE '%Coding%');
