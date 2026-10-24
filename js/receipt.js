function createReceipt(booking) {
    if (!booking) {
        return null;
    }

    return {
        bookingId: booking.id,
        station: booking.station,
        destination: booking.destinationLabel || booking.destination,
        seats: booking.seats,
        passengerCounts: booking.passengerCounts,
        unitFare: booking.unitFare,
        subtotal: booking.subtotal,
        studentDiscountAmount: booking.studentDiscountAmount,
        seniorCitizenDiscountAmount: booking.seniorCitizenDiscountAmount,
        totalDiscount: booking.totalDiscount,
        totalAmount: booking.totalAmount,
        status: booking.status,
        date: booking.date,
        time: booking.time
    };
}

function formatReceiptDate(date) {
    if (!date) {
        return "";
    }

    const receiptDate = new Date(date);

    return receiptDate.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

function formatReceiptTime(date) {
    if (!date) {
        return "";
    }

    const receiptTime = new Date(date);

    return receiptTime.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit"
    });
}