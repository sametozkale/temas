import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type * as React from "react";

/*
 * Email-only styles. Email clients cannot read Tailwind tokens, so these are
 * the docs/01 palette values mirrored as inline styles (paper background,
 * hairline border, warm black).
 */
const styles = {
  body: {
    backgroundColor: "#FAFAF7",
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#1C1B19",
    margin: 0,
    padding: "32px 0",
  },
  container: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E9E6E0",
    borderRadius: 10,
    maxWidth: 520,
    margin: "0 auto",
    padding: "32px",
  },
  brand: {
    fontFamily: 'Newsreader, Georgia, "Times New Roman", serif',
    fontSize: 20,
    fontWeight: 500,
    margin: "0 0 24px",
    letterSpacing: "-0.01em",
  },
  footer: {
    color: "#6E6C66",
    fontSize: 12,
    margin: "16px 0 0",
  },
  hr: { borderColor: "#E9E6E0", margin: "24px 0" },
} satisfies Record<string, React.CSSProperties>;

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Newsreader:wght@500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>Temas</Text>
          <Section>{children}</Section>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            This email was sent via Temas. If you weren&apos;t expecting it, you
            can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: {
    fontFamily: 'Newsreader, Georgia, "Times New Roman", serif',
    fontSize: 24,
    fontWeight: 500,
    lineHeight: 1.15,
    letterSpacing: "-0.01em",
    margin: "0 0 12px",
  },
  text: { fontSize: 15, lineHeight: 1.5, margin: "0 0 16px" },
  muted: { fontSize: 13, color: "#6E6C66", margin: "0 0 8px" },
  /** Matches login’s `text-sm text-muted-foreground` supporting line. */
  lede: {
    fontSize: 14,
    lineHeight: 1.5,
    color: "#6E6C66",
    margin: "0 0 24px",
  },
  button: {
    backgroundColor: "#22211E",
    color: "#FAFAF7",
    borderRadius: 9999,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: "20px",
    padding: "10px 16px",
    textDecoration: "none",
    display: "inline-block",
  },
} satisfies Record<string, React.CSSProperties>;
