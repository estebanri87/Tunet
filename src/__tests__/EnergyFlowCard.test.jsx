import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EnergyFlowCard from '../components/cards/EnergyFlowCard';

const makeEntities = ({ grid, solar, battery, home }) => ({
  'sensor.grid_power': { state: String(grid) },
  'sensor.solar_power': { state: String(solar) },
  'sensor.battery_power': { state: String(battery) },
  'sensor.home_power': { state: String(home) },
});

const baseProps = (overrides = {}) => ({
  cardId: 'energy_flow_1',
  gridEntityId: 'sensor.grid_power',
  solarEntityId: 'sensor.solar_power',
  batteryEntityId: 'sensor.battery_power',
  homeEntityId: 'sensor.home_power',
  entities: makeEntities({ grid: 500, solar: 1200, battery: -200, home: 1500 }),
  dragProps: {},
  controls: null,
  cardStyle: {},
  editMode: false,
  customNames: {},
  customIcons: {},
  settings: { size: 'large' },
  isMobile: false,
  onOpen: vi.fn(),
  t: (key) => key,
  ...overrides,
});

describe('EnergyFlowCard', () => {
  it('renders the four node labels with formatted power values', () => {
    render(<EnergyFlowCard {...baseProps()} />);

    expect(screen.getByText('energyFlow.grid')).toBeInTheDocument();
    expect(screen.getByText('energyFlow.solar')).toBeInTheDocument();
    expect(screen.getByText('energyFlow.battery')).toBeInTheDocument();
    expect(screen.getByText('energyFlow.home')).toBeInTheDocument();
    expect(screen.getByText('1.2 kW')).toBeInTheDocument();
    expect(screen.getByText('1.5 kW')).toBeInTheDocument();
  });

  it('hides solar and battery nodes when not configured', () => {
    render(
      <EnergyFlowCard
        {...baseProps({
          solarEntityId: null,
          batteryEntityId: null,
        })}
      />
    );

    expect(screen.queryByText('energyFlow.solar')).not.toBeInTheDocument();
    expect(screen.queryByText('energyFlow.battery')).not.toBeInTheDocument();
    expect(screen.getByText('energyFlow.grid')).toBeInTheDocument();
    expect(screen.getByText('energyFlow.home')).toBeInTheDocument();
  });

  it('shows a compact layout for the small size setting', () => {
    render(<EnergyFlowCard {...baseProps({ settings: { size: 'small' } })} />);

    expect(screen.getByText('energyFlow.home')).toBeInTheDocument();
    expect(screen.queryByText('energyFlow.grid')).not.toBeInTheDocument();
  });

  it('renders -- for unavailable entity state', () => {
    const entities = makeEntities({ grid: 500, solar: 1200, battery: -200, home: 1500 });
    entities['sensor.grid_power'] = { state: 'unavailable' };
    render(<EnergyFlowCard {...baseProps({ entities })} />);

    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });
});
