let timerInterval = null;


function formatTimer(seconds) {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}


function updateQueueBookingStatuses(statusChanges) {
    if (statusChanges.size === 0) {
        return;
    }

    const bookings = getBookings();
    let bookingsChanged = false;

    if (Array.isArray(bookings)) {
        bookings.forEach((booking) => {
            const status = statusChanges.get(booking.queueId);

            if (status && booking.status !== status) {
                booking.status = status;
                bookingsChanged = true;
            }
        });

        if (bookingsChanged) {
            saveBookings(bookings);
        }
    }

    const currentBooking = getCurrentBooking();

    if (
        currentBooking &&
        statusChanges.has(currentBooking.queueId) &&
        currentBooking.status !== statusChanges.get(currentBooking.queueId)
    ) {
        currentBooking.status =
            statusChanges.get(currentBooking.queueId);
        saveCurrentBooking(currentBooking);
    }
}


function updateTimer() {
    const activeQueues = getActiveQueues();
    const remainingQueues = [];
    const statusChanges = new Map();
    let queuesChanged = false;

    activeQueues.forEach((queue) => {
        if (!queue || (queue.status !== "waiting" && queue.status !== "boarding")) {
            queuesChanged = true;
            return;
        }

        if (queue.status === "waiting" && isFull(queue.totalSeats)) {
            startBoardingTimer(queue);
            statusChanges.set(queue.id, "boarding");
            queuesChanged = true;
        } else {
            const elapsedSeconds = Math.floor(
                (Date.now() - Number(queue.timerStartedAt)) / 1000
            );
            const remainingSeconds =
                Number(queue.timerDuration) - elapsedSeconds;

            if (remainingSeconds <= 0 && queue.status === "waiting") {
                startBoardingTimer(queue);
                statusChanges.set(queue.id, "boarding");
                queuesChanged = true;
            } else if (remainingSeconds <= 0 && queue.status === "boarding") {
                completeActiveQueue(queue);
                addTripHistory(queue);
                statusChanges.set(queue.id, "completed");
                queuesChanged = true;
                document.dispatchEvent(
                    new CustomEvent("tripHistoryUpdated")
                );
                return;
            }
        }

        remainingQueues.push(queue);
    });

    if (queuesChanged) {
        saveActiveQueues(remainingQueues);
    }

    updateQueueBookingStatuses(statusChanges);

    if (typeof updateTripPage === "function") {
        updateTripPage();
    }
}


function startTripTimer() {
    if (timerInterval !== null) {
        return;
    }

    updateTimer();

    timerInterval = setInterval(
        updateTimer,
        1000
    );
}


document.addEventListener(
    "DOMContentLoaded",
    startTripTimer
);
