import React from 'react'

import { useSetWindowTitle } from '../hooks/WindowTitle'

// @ts-ignore
import Heading1 from '@material-tailwind/react/Heading1'
// @ts-ignore
import Heading6 from '@material-tailwind/react/Heading6'

const NostrQuote = () => (
  <blockquote className="relative p-4 mb-4 border-l font-serif quote">
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
      <Heading1 color="blueGray">FAQ</Heading1>

      <Heading6 color="blueGray">What is this?</Heading6>
      <p className="mb-8 font-serif">A chess app on nostr.</p>

      <Heading6 color="blueGray">What is nostr?</Heading6>
      <NostrQuote />
      <p className="mb-8 font-serif">
        <a className="underline" target="_blank" rel="noopener noreferrer" href="https://github.com/fiatjaf/nostr">
          Read more about nostr on GitHub.
        </a>
      </p>

      <Heading6 color="blueGray">How can I do X?</Heading6>
      <p className="mb-8 font-serif">You probably can't. The current functionality is very limited.</p>
      <Heading6 color="blueGray">I found a bug. How can I report it?</Heading6>
      <p className="mb-8 font-serif">
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
      <Heading6 color="blueGray">This is in beta. Is this just a demo application?</Heading6>
      <p className="mb-8 font-serif">Yes.</p>
      <Heading6 color="blueGray">Where are the robots coming from?</Heading6>
      <p className="mb-8 font-serif">
        Robots lovingly delivered by{' '}
        <a className="underline" target="_blank" rel="noopener noreferrer" href="https://robohash.org/">
          https://robohash.org
        </a>
        .
      </p>
    </div>
  )
}
