import { test, expect } from '@playwright/test';

test.use({
  geolocation: { latitude: -36.8485, longitude: 174.7633 }, // Auckland CBD
  permissions: ['geolocation'],
});

const MOCK_REASON = 'Mocked reason: drive to your destination in about 5 minutes.';

// A full, type-shape-accurate CommutePlan response — mirrors exactly what
// backend/services/planner.py returns, just with values we control so the
// test can assert on them deterministically.
const MOCK_RESPONSE = {
  current_location: '1 Queen Street, Auckland CBD, Auckland 1010, New Zealand',
  destination: 'Auckland CBD',
  driving_route: { duration: '300s', distance_meters: 2000, static_duration: '250s' },
  transit_route: {
    available: false,
    status: 'No public transport route was found for this trip right now.',
  },
  weather: { temperature: 18, feels_like: 17, precipitation: 0, rain: 0, weather_code: 1, wind_speed: 10 },
  weather_notice: null,
  recommendation: MOCK_REASON,
  routing_basis: 'live',
  decision: {
    recommended_mode: 'driving',
    recommended_label: 'Drive',
    recommended_icon: '🚗',
    leave_time: '8:55 AM',
    arrival_time: '9:00 AM',
    travel_time_minutes: 5,
    traffic: {
      level: 'normal',
      importance: 'high',
      message: 'Traffic is flowing close to normal conditions.',
      tag: 'Normal traffic',
    },
    headline: 'Driving is currently the best available option.',
    reason: MOCK_REASON,
    summary: MOCK_REASON,
    decision_factors: [
      { type: 'traffic', importance: 'high', message: 'Traffic is flowing close to normal conditions.' },
      { type: 'weather', importance: 'medium', message: 'Weather conditions look favourable for the trip.' },
    ],
    highlights: [],
    comparison: {
      title: "Today's Comparison",
      recommended_mode: 'driving',
      driving: { label: 'Drive', leave_time: '8:55 AM', arrival_time: '9:00 AM', travel_time_minutes: 5 },
      transit: {
        label: 'Public transport',
        available: false,
        status: 'No public transport route was found for this trip right now.',
        route_label: null,
        departure_time: null,
        arrival_time: null,
        travel_time_minutes: null,
        next_departures: [],
      },
    },
    destination: 'Auckland CBD',
  },
};

test('destination -> Plan -> recommendation appears', async ({ page }) => {
  await page.route('**/commute/plan', async (route) => {
    await route.fulfill({ json: MOCK_RESPONSE });
  });

  await page.goto('/');
  await page.waitForTimeout(500); // let the mocked geolocation resolve into React state

  await page.getByPlaceholder('Where do you need to be?').fill('Auckland CBD');
  await page.getByRole('button', { name: 'Plan' }).click();

  await expect(page.getByText(MOCK_REASON)).toBeVisible();
  await expect(page.getByText('8:55')).toBeVisible();
});
