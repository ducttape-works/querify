export const queries = {
  seed: `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL
);

INSERT INTO users (id, name, email) VALUES
  (1, 'Oluwatunmise Olatunbosun', 'oluwatunmise@thecloaq.com')
`,
  default: "SELECT * FROM users ORDER BY id;",
} as const;
