window.paypal
  .Buttons({
    async createOrder() {
      try {
        const response = await fetch("http://localhost:5000/paypal/createOrder", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Basic YXBpdXNlcjp0YXN0eWxhbG1hc3NAMTE1NA=="
          },
          // use the "body" param to optionally pass additional order information
          // like product ids and quantities
          // body: JSON.stringify({
          //   cart: [
          //     {
          //       id: "YOUR_PRODUCT_ID",
          //       quantity: "YOUR_PRODUCT_QUANTITY",
          //     },
          //   ],
          // }),
          body: JSON.stringify(
            {
              reference_id: "internalId",
              invoice_id: "invoice_id",
              amount: {
                currencyCode: "USD",
                value: 110.00
              },
              brand_name: "BFL",
              return_url: "https://www.beallsflorida.com/review",
              cancel_url: "https://www.beallsflorida.com/billing",
              address: {
                  address_line_1: "123 Main St",
                  address_line_2: "Apt # 101",
                  city: "Fairfax",
                  state: "VA",
                  postal_code: "20144",
                  country_code: "US"
              }
            }
        ),

        });

        const orderData = await response.json();

        if (orderData.id) {
          return orderData.id;
        } else {
          const errorDetail = orderData?.details?.[0];
          const errorMessage = errorDetail
            ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
            : JSON.stringify(orderData);

          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },
    async onApprove(data, actions) {
      try {
        // const response = await fetch(`/api/orders/${data.orderID}/capture`, {
        const response = await fetch(`http://localhost:5000/paypal/authorize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Basic YXBpdXNlcjp0YXN0eWxhbG1hc3NAMTE1NA=="
          },
          body: JSON.stringify(
            {}
          )
        });

        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message

        const errorDetail = orderData?.details?.[0];

        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  actions.redirect('thank_you.html');
          const transaction =
            orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
            orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
          resultMessage(
            `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`,
          );
          console.log(
            "Capture result",
            orderData,
            JSON.stringify(orderData, null, 2),
          );
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`,
        );
      }
    },
  })
  .render("#paypal-button-container");

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message) {
  const container = document.querySelector("#result-message");
  container.innerHTML = message;
}
