import './ActivityIndicator.css'

export const ActivityIndicator = ({ isOn }: { isOn: boolean }) => {
  return <span className={`activity-indicator ${isOn ? 'activity-indicator-on' : 'activity-indicator-off'}`} />
}
