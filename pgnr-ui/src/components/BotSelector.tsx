import React, { ChangeEvent } from 'react'
import { AvailableBots, InitialisedBot } from '../util/bot'

import styles from './BotSelector.module.css'

export type SelectedBot = {
  name: string
  bot: InitialisedBot
} | null

interface BotSelectorProps {
  playerName: string
  availableBots: AvailableBots
  selectedBotName: string | null
  setSelectedBotName: (botName: string | null) => void
  disabled: boolean
}

export const BotSelector = ({
  playerName,
  availableBots,
  selectedBotName,
  setSelectedBotName,
  disabled,
}: BotSelectorProps) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const name = e.target.value
    setSelectedBotName(name || null)
  }

  return (
    <div className={styles.BotSelector}>
      <label>{playerName}</label>
      <select value={selectedBotName || undefined} onChange={handleChange} disabled={disabled}>
        <option value="" key="User">
          User
        </option>
        {Object.keys(availableBots).map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </div>
  )
}
