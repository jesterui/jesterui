import React, { ChangeEvent } from 'react'
import { AvailableBots, InitialisedBot } from '../util/bot'
import styles from './BotSelector.module.css'

export type SelectedBot = {
  name: string
  move: InitialisedBot
} | null

interface BotSelectorProps {
  playerName: string
  availableBots: AvailableBots
  selectedBot: SelectedBot
  setSelectedBot: (bot: SelectedBot) => void
  disabled: boolean
}

export const BotSelector = ({ playerName, availableBots, selectedBot, setSelectedBot, disabled }: BotSelectorProps) => {
  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const name = e.target.value
    setSelectedBot(name ? { name, move: availableBots[name]() } : null)
  }

  return (
    <div className={styles.BotSelector}>
      <label>{playerName}</label>
      <select value={selectedBot?.name} onChange={handleChange} disabled={disabled}>
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
