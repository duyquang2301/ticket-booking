import http from 'k6/http';
import { sleep, check } from 'k6';

const users = JSON.parse(open('./users.json'));

export const options = {
  vus: 1000,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://auth-service:3000';
const CONCERT_URL = 'http://concert-service:3001';
const BOOKING_URL = 'http://booking-service:3002';

export function setup() {
  return users; 
}

export default function (data) {
    const user = data[__VU - 1];
  const credentials = {
    email: user.email,
    password: user.password,
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(credentials), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, { 'login successful': (r) => r.status === 201 });
  const jwtToken = loginRes.json().access_token;

  const concertId = '6822b94cecc73732cd9be69c';
  const concertRes = http.get(`${CONCERT_URL}/concerts/${concertId}`, {
    headers: { Authorization: `Bearer ${jwtToken}` },
  });
  check(concertRes, { 'concert fetched': (r) => r.status === 200 });

  const seatType = concertRes.json().seatTypeIds[0];
  const bookingData = {
    concertId,
    seatTypeId: seatType._id,
    quantity: 1
  };

  const bookingRes = http.post(`${BOOKING_URL}/bookings`, JSON.stringify(bookingData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwtToken}`,
    },
  });

  check(bookingRes, {
    'booking successful': (r) => r.status === 201 || r.json().message === 'Not enough tickets available',
  });

  sleep(0.1); 
}