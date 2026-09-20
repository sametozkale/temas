import { Button, Heading, Text } from "@react-email/components";

import { EmailLayout, emailStyles } from "./_layout";

export function AuthLinkEmail({
  preview,
  heading,
  lede,
  href,
  cta,
}: {
  preview: string;
  heading: string;
  lede: string;
  href: string;
  cta: string;
}) {
  return (
    <EmailLayout preview={preview}>
      <Heading style={emailStyles.heading}>{heading}</Heading>
      <Text style={emailStyles.lede}>{lede}</Text>
      <Button href={href} style={emailStyles.button}>
        {cta}
      </Button>
    </EmailLayout>
  );
}

export function AuthCodeEmail({
  preview,
  heading,
  lede,
  code,
}: {
  preview: string;
  heading: string;
  lede: string;
  code: string;
}) {
  return (
    <EmailLayout preview={preview}>
      <Heading style={emailStyles.heading}>{heading}</Heading>
      <Text style={emailStyles.lede}>{lede}</Text>
      <Text
        style={{
          ...emailStyles.heading,
          letterSpacing: "0.2em",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {code}
      </Text>
    </EmailLayout>
  );
}
