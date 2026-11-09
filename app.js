
const form = document.getElementById("orderForm");
const message = document.getElementById("message");

const API_URL = "https://studio-s-media-api.akhilkhalilsyed1.workers.dev/api/orders";

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  message.textContent = "ऑर्डर पाठवत आहे...";

  const data = new FormData(form);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      body: data
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "ऑर्डर पाठवता आली नाही.");
    }

    message.textContent =
      `ऑर्डर यशस्वी! तुमचा ऑर्डर क्रमांक: ${result.orderId}. ${result.message}`;

    form.reset();

  } catch (err) {
    message.textContent = "त्रुटी: " + err.message;
  }
});
