import { listenChange, notifyChange } from './realtimeSync';

export const PARKING_SYNC_CODE = 'parking:vitrido:changed';

export const notifyParkingChange = () => {
  notifyChange(PARKING_SYNC_CODE);
};

export const listenParkingChange = (callback: () => void) => {
  return listenChange(PARKING_SYNC_CODE, callback);
};