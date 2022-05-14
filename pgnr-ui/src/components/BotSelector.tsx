import React from 'react'
import { AvailableBots, InitialisedBot } from '../util/bot'

// @ts-ignore
import Dropdown from '@material-tailwind/react/Dropdown'
// @ts-ignore
import DropdownItem from '@material-tailwind/react/DropdownItem'

import styles from './BotSelector.module.css'

export type SelectedBot = {
  name: string
  bot: InitialisedBot
} | null

interface BotSelectorProps {
  label: string
  availableBots: AvailableBots
  selectedBotName: string | null
  setSelectedBotName: (botName: string | null) => void
  disabled: boolean
}

export const BotSelector = ({ label, availableBots, selectedBotName, setSelectedBotName }: BotSelectorProps) => {
  return (
    <div className={`${styles.BotSelector} flex items-center`}>
      <div>
        <label>{label}</label>
      </div>

      <div>
        <Dropdown
          color="blueGray"
          placement="bottom-start"
          buttonText={selectedBotName ? selectedBotName : 'None'}
          buttonType="filled"
          size="regular"
          rounded={false}
          block={true}
          ripple="light"
        >
          <DropdownItem color="blueGray" ripple="light" onClick={() => setSelectedBotName(null)}>
            None
          </DropdownItem>
          {Object.keys(availableBots).map((name) => (
            <DropdownItem color="blueGray" ripple="light" onClick={() => setSelectedBotName(name)} key={name}>
              {name}
            </DropdownItem>
          ))}
        </Dropdown>
      </div>
    </div>
  )
}
