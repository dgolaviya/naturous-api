/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
const stripe = Stripe('pk_test_51HKGBGFOi4OgysseoqYBLzAjde4Ih6GSgAlsowdT9SwfSqEQsWiNsWdefzxMFH7fVgMTU2HCOVqWoOQeZB9aFvWu00wxQNKOAY');

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `/api/v1/bookings/checkout-session/${tourId}`
    );

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
