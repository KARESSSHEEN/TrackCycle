function validateReservation(station, destination, seats, availableSeats = 6) {
    if (!station) {
        return {
            valid: false,
            message: "Please select a pickup station."
        };
    }

    if (!destination) {
        return {
            valid: false,
            message: "Please select a destination."
        };
    }

    if (!seats) {
        return {
            valid: false,
            message: "Please select the number of seats."
        };
    }

    const seatCount = Number(seats);

    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 6) {
        return {
            valid: false,
            message: "You can reserve between 1 and 6 seats."
        };
    }

    if (seatCount > availableSeats) {
        return {
            valid: false,
            message: `Only ${availableSeats} seat(s) are available at this station.`
        };
    }

    return {
        valid: true,
        message: ""
    };
}