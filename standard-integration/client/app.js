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
              reference_id: generateUUID(),
              invoice_id: generateUUID(),
              amount: {
                currency_code: "USD",
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
      console.error(data);
      try {
        // const response = await fetch(`/api/orders/${data.orderID}/capture`, {
        const response = await fetch(`http://localhost:5000/paypal/authorizeOrder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Basic YXBpdXNlcjp0YXN0eWxhbG1hc3NAMTE1NA=="
          },
          body: JSON.stringify(
            {
              payPalOrderId: data.orderID
            }
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


function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();//Timestamp
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if(d > 0){//Use timestamp until depleted
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else {//Use microseconds since page-load if supported
          r = (d2 + r)%16 | 0;
          d2 = Math.floor(d2/16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}