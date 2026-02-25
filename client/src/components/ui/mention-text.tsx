import { Link } from "wouter";

interface MentionTextProps {
  text: string;
  mentionClassName?: string;
}

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/i;

const MentionText = ({ text, mentionClassName = "text-cyan-200 hover:text-cyan-100" }: MentionTextProps) => {
  const tokens = text.split(/(\s+)/);

  return (
    <>
      {tokens.map((token, index) => {
        if (!token || /^\s+$/.test(token)) {
          return <span key={`ws-${index}`}>{token}</span>;
        }

        const leadingMatch = token.match(/^[("'[{]+/);
        const trailingMatch = token.match(/[.,!?;:)\]"'}]+$/);
        const leading = leadingMatch?.[0] ?? "";
        const trailing = trailingMatch?.[0] ?? "";

        const coreStart = leading.length;
        const coreEnd = token.length - trailing.length;
        const core = token.slice(coreStart, coreEnd);

        if (core.startsWith("@")) {
          const username = core.slice(1);
          if (USERNAME_REGEX.test(username)) {
            return (
              <span key={`mention-${index}`}>
                {leading}
                <Link href={`/${username}`} className={mentionClassName}>
                  @{username}
                </Link>
                {trailing}
              </span>
            );
          }
        }

        return <span key={`txt-${index}`}>{token}</span>;
      })}
    </>
  );
};

export default MentionText;
