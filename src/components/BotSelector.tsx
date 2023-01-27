import { Select } from 'react-daisyui'

import { AvailableBots } from '../util/bot'
import * as UCI from '../util/uci'

export type SelectedBot = {
  name: string
  bot: UCI.Engine
} | null

interface BotSelectorProps {
  label: string
  availableBots: AvailableBots
  selectedBotName: string | null
  setSelectedBotName: (botName: string | null) => void
  disabled: boolean
}

export const BotSelector = ({
  label,
  availableBots,
  selectedBotName,
  setSelectedBotName,
  disabled,
}: BotSelectorProps) => {
  return (
    <div className="flex items-center gap-2 font-sans">
      <div className="form-control w-full max-w-xs">
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
        <Select
          value={selectedBotName || undefined}
          onChange={(event) => setSelectedBotName(event.target.value || null)}
          disabled={disabled}
        >
          <Select.Option value={undefined}>Default</Select.Option>
          <>
            {Object.keys(availableBots).map((name) => (
              <Select.Option value={name} key={name}>
                {name}
              </Select.Option>
            ))}
          </>
        </Select>
      </div>
    </div>
  )
}
