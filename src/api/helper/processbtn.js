// module.exports = function processButton(buttons) {
//     const preparedButtons = []

//     buttons.map((button) => {
//         if (button.type == 'replyButton') {
//             preparedButtons.push({
//                 quickReplyButton: {
//                     displayText: button.title ?? '',
//                 },
//             })
//         }

//         if (button.type == 'callButton') {
//             preparedButtons.push({
//                 callButton: {
//                     displayText: button.title ?? '',
//                     phoneNumber: button.payload ?? '',
//                 },
//             })
//         }
//         if (button.type == 'urlButton') {
//             preparedButtons.push({
//                 urlButton: {
//                     displayText: button.title ?? '',
//                     url: button.payload ?? '',
//                 },
//             })
//         }
//     })
//     return preparedButtons
// }
module.exports = function processButton(buttons) {
    return buttons.map((btn, index) => {
      switch (btn.type) {
        case "replyButton":
          return {
            buttonId: `reply_${index}`,
            buttonText: { displayText: btn.title },
            type: 1
          };
        case "urlButton":
          return {
            buttonId: `url_${index}`,
            buttonText: { displayText: btn.title },
            type: 1
          };
        case "callButton":
          return {
            buttonId: `call_${index}`,
            buttonText: { displayText: btn.title },
            type: 1
          };
        default:
          return null;
      }
    }).filter(Boolean);
  };
  