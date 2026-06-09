import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface AccountPasswordEmailProps {
  password: string
  role: string
  loginUrl: string
  companyName: string
}
import * as React from 'react'
export const AccountPasswordEmail = ({
  password,
  role,
  loginUrl,
  companyName,
}: AccountPasswordEmailProps) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-[#f6f9fc] font-sans">
        <Preview>Your {companyName} account has been created</Preview>

        <Container className="bg-white mx-auto py-5 pb-12 mb-16">
          <Section
            className="px-12"
            style={{
              padding: '0px 48px',
            }}
          >
            <Hr className="border-[#e6ebf1] my-5" />

            <Text className="text-[#525f7f] text-base leading-6 text-left">
              Your <strong>{role}</strong> account has been created on{' '}
              <strong>{companyName}</strong>. Use the temporary password below to log in for the
              first time.
            </Text>

            <Text className="text-[#525f7f] text-base leading-6 text-left">
              Your temporary password is:
            </Text>

            <Section className="bg-[#f6f9fc] rounded-[4px] px-4 py-3 my-4">
              <Text className="font-mono text-xl font-bold tracking-widest text-[#0f172a] m-0 break-all">
                {password}
              </Text>
            </Section>

            <Button
              className="bg-[#656ee8] rounded-[3px] text-white text-base font-bold no-underline text-center block p-[10px]"
              href={loginUrl}
            >
              Log in to your account
            </Button>

            <Hr className="border-[#e6ebf1] my-5" />

            <Text className="text-[#525f7f] text-base leading-6 text-left">
              For security, please change your password immediately after logging in. Temporary
              passwords expire in <strong>24 hours</strong>.
            </Text>

            <Text className="text-[#525f7f] text-base leading-6 text-left">
              If you have any trouble logging in or didn't expect this email, please contact our{' '}
              <Link className="text-[#556cd6]" href="mailto:support@example.com">
                support team
              </Link>{' '}
              right away.
            </Text>

            <Text className="text-[#525f7f] text-base leading-6 text-left">
              — The {companyName} team
            </Text>

            <Hr className="border-[#e6ebf1] my-5" />

            <Text className="text-[#8898aa] text-xs leading-4">
              {companyName}, 123 Business Ave, Suite 100, San Francisco, CA 94105
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)
