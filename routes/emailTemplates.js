const emailTemplates = {
    welcomeMessage: {
        userSubject: 'Welcome to E-Gadget World – Your Trusted Partner in Refurbished Laptops',
        userMessage: (username) => `
            <p>Dear ${username},</p>
            <p>Welcome to E-Gadget World! We’re thrilled to have you join our community of tech enthusiasts who value high-quality, reliable, and affordable technology.</p>
            <p>At E-Gadget World, we specialize in giving pre-owned laptops a new lease on life. Our team of experienced technicians meticulously inspects and upgrades each device to ensure it meets our rigorous standards for performance, reliability, and aesthetics. We believe that quality technology should be accessible to everyone, and we are committed to delivering refurbished laptops that look and perform like new.</p>
            <p>Here’s what you can expect from us:</p>
            <ul>
                <li><strong>Quality Assurance:</strong> Every laptop undergoes thorough testing and inspection to ensure it meets our high standards.</li>
                <li><strong>Genuine Parts:</strong> We only use authentic parts during the refurbishment process, guaranteeing durability and performance.</li>
                <li><strong>Exceptional Customer Service:</strong> Our team is always here to assist you with any questions or support you might need.</li>
            </ul>
            <p>We invite you to explore our wide range of refurbished laptops and discover the perfect device to meet your needs. Whether you’re a student, a professional, or simply looking for a reliable laptop, E-Gadget World has something for everyone.</p>
            <p>Thank you for choosing E-Gadget World as your trusted partner in refurbished laptops. We look forward to providing you with the best technology and service.</p>
            <p>If you have any questions, don’t hesitate to reach out to us at egadgetworldindia@gmail.com.</p>
            <p>Best regards,</p>
            <p>The E-Gadget World Team</p>
            <p>egadgetworldindia@gmail.com</p>
        `,
    },
    orderCreation: {
        adminSubject: 'New Order Received - Order #{{Order_Number}}',
        adminMessage: (orderNumber, customerName, amount, orderDate, shippingAddress) => `
            <p>Dear Admin,</p>
            <p>We are pleased to inform you that a new order has been placed on E-Gadget World.</p>
            <p><strong>Order Details:</strong></p>
            <p>- <strong>Order Number:</strong> ${orderNumber}</p>
            <p>- <strong>Customer Name:</strong> ${customerName}</p>
            <p>- <strong>Amount:</strong>Rs. ${amount}</p>
            <p>- <strong>Order Date:</strong> ${orderDate}</p>
            <p>- <strong>Shipping Address:</strong> ${shippingAddress}</p>
            <p>Please review the order details and ensure that the necessary steps are taken to process and ship the order promptly.</p>
            <p>If you have any questions or require further information, please don't hesitate to reach out.</p>
            <p>Thank you for your attention to this order.</p>
            <p>Best regards,</p>
            <p>E-Gadget World Team</p>
        `,
        userSubject: 'Order Confirmation - Order #{{Order_Number}}',
        userMessage: (orderNumber, customerName, amount, orderDate, shippingAddress) => `
            <p>Dear ${customerName},</p>
            <p>Thank you for choosing E-Gadget World!</p>
            <p>We are thrilled to confirm that your order has been successfully placed. Our team will now begin preparing your item for shipment.</p>
            <p><strong>Order Details:</strong></p>
            <p>- <strong>Order Number:</strong> ${orderNumber}</p>
            <p>- <strong>Amount:</strong>Rs. ${amount}</p>
            <p>- <strong>Order Date:</strong> ${orderDate}</p>
            <p>- <strong>Shipping Address:</strong> ${shippingAddress}</p>
            <p>You will receive a notification with the tracking details once your order has been shipped.</p>
            <p>If you have any questions or need further assistance, please feel free to contact us.</p>
            <p>Thank you for trusting E-Gadget World. We look forward to serving you again.</p>
            <p>Best regards,</p>
            <p>E-Gadget World Team</p>
        `,
    },
    paymentConfirmation: {
        userSubject: 'Payment Confirmation for Your Recent Transaction',
        userMessage: (username, amount, transactionId, orderId) => `
            <p>Dear ${username},</p>
            <p>Thank you for your recent payment. We are pleased to inform you that your payment of Rs. ${amount} has been successfully processed.</p>
            <p><strong>Transaction Details:</strong></p>
            <p>- <strong>Transaction ID:</strong> ${transactionId}</p>
            <p>- <strong>Order ID:</strong> ${orderId}</p>
            <p>- <strong>Amount:</strong>Rs. ${amount}</p>
            <p>- <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p>If you have any questions or need further assistance, please do not hesitate to contact us.</p>
            <p>Thank you for choosing WordCreation.</p>
            <p>Best regards,</p>
              <p>Best regards,</p>
            <p>The E-Gadget World Team</p>
            <p>egadgetworldindia@gmail.com</p>
        `,
        adminSubject: 'Payment Received Confirmation',
        adminMessage: (username, amount, transactionId, orderId) => `
            <p>Dear Admin,</p>
            <p>We have successfully received a payment from ${username} for Rs. ${amount}. Please find the details of the transaction below:</p>
            <p><strong>Transaction Details:</strong></p>
            <p>- <strong>User Name:</strong> ${username}</p>
            <p>- <strong>Transaction ID:</strong> ${transactionId}</p>
            <p>- <strong>Order ID:</strong> ${orderId}</p>
            <p>- <strong>Amount:</strong> Rs. ${amount}</p>
            <p>- <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p>Please update your records accordingly and let us know if any further action is required.</p>
            <p>Thank you for your attention to this matter.</p>
            <p>Best regards,</p>
               <p>Best regards,</p>
            <p>The E-Gadget World Team</p>
            <p>egadgetworldindia@gmail.com</p>
        `,
    },
    orderShippingNotification: {
        userSubject: 'Your E-Gadget World Order Has Shipped!',
        userMessage: (customerName, orderNumber, trackingNumber, carrierName, trackingLink) => `
            <p>Dear ${customerName},</p>
            <p>We’re excited to let you know that your order ${orderNumber} from E-Gadget World has been shipped! Your refurbished laptop is on its way to you and will arrive soon.</p>
            <p><strong>Shipping Details:</strong></p>
            <p>- <strong>Order Number:</strong> ${orderNumber}</p>
            <p>- <strong>Tracking Number:</strong> ${trackingNumber}</p>
            <p>- <strong>Carrier:</strong> ${carrierName}</p>
            <p>You can track your order using the following link: <a href="${trackingLink}">Track Your Order</a></p>
            <p>Our team at E-Gadget World has meticulously inspected, upgraded, and packaged your device to ensure it arrives in perfect condition. We’re confident that you’ll love your refurbished laptop as much as we loved bringing it back to life.</p>
            <p>If you have any questions about your order or need further assistance, feel free to reply to this email or contact our customer service team at [Customer Service Email].</p>
            <p>Thank you for choosing E-Gadget World. We appreciate your business and look forward to serving you again!</p>
             <p>Best regards,</p>
            <p>The E-Gadget World Team</p>
            <p>egadgetworldindia@gmail.com</p>
        `,
    },
    orderCompletionNotification: {
        userSubject: 'Your E-Gadget World Order is Complete!',
        userMessage: (customerName, orderNumber, deliveryDate) => `
            <p>Dear ${customerName},</p>
            <p>We’re delighted to inform you that your order ${orderNumber} from E-Gadget World has been successfully delivered and completed!</p>
            <p>Your refurbished laptop, meticulously upgraded and tested by our expert technicians, should now be in your hands, ready to provide the performance and reliability you expect.</p>
            <p><strong>Order Summary:</strong></p>
            <p>- <strong>Order Number:</strong> ${orderNumber}</p>
            <p>- <strong>Delivery Date:</strong> ${deliveryDate}</p>
            <p>If you have any questions, concerns, or need any assistance with your new device, please don’t hesitate to contact us. We’re here to help and ensure you have the best experience with your purchase.</p>
            <p>Thank you for choosing E-Gadget World. We’re thrilled to have you as part of our community and hope you enjoy your new laptop!</p>
             <p>Best regards,</p>
            <p>The E-Gadget World Team</p>
            <p>egadgetworldindia@gmail.com</p>
        `,
    }
};

module.exports = emailTemplates;
