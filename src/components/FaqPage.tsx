import { H1, H3 } from './Headings'
import { useSetWindowTitle } from '../hooks/WindowTitle'

const NostrQuote = () => (
  <blockquote className="relative p-4 mb-4 border-l border-base-content/20 font-serif">
    <span className="block absolute top-0 leading-none opacity-10 text-8xl" aria-hidden="true">
      &ldquo;
    </span>
    <p className="mb-4 pl-2 pt-2">
      The simplest open protocol that is able to create a censorship-resistant global network once and for all.
    </p>
    <cite className="flex items-center">
      <span className="flex flex-col items-start">
        <span className="text-sm">— nostr protocol readme</span>
      </span>
    </cite>
  </blockquote>
)

export default function FaqPage() {
  useSetWindowTitle({ text: 'FAQ' })

  return (
    <div className="screen-faq">
      <H1>FAQ</H1>

      <H3>What is this?</H3>
      <p className="mb-8">A chess app on nostr.</p>

      <H3>What is nostr?</H3>
      <NostrQuote />
      <p className="mb-8">
        <a className="underline" target="_blank" rel="noopener noreferrer" href="https://github.com/fiatjaf/nostr">
          Read more about nostr on GitHub.
        </a>
      </p>

      <H3>How can I do X?</H3>
      <p className="mb-8">You probably can't. The current functionality is very limited.</p>

      <H3>I found a bug. How can I report it?</H3>
      <p className="mb-8">
        Please open an issue{' '}
        <a
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/jesterui/jesterui/issues"
        >
          on the project's GitHub repo
        </a>
        .
      </p>

      <H3>This is in beta. Is this just a demo application?</H3>
      <p className="mb-8">Yes.</p>

      <H3>Where are the robots coming from?</H3>
      <p className="mb-8">
        Robots lovingly delivered by{' '}
        <a className="underline" target="_blank" rel="noopener noreferrer" href="https://robohash.org/">
          https://robohash.org
        </a>
        .
      </p>
    </div>
  )
}
