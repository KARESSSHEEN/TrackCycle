function getBookingStatus(booking, activeQueue) {
    if (activeQueue) {
        return activeQueue.status === "boarding" ? "Boarding" : "Waiting";
    }

    if (booking && booking.status === "completed") {
        return "Departed";
    }

    if (booking && booking.status === "cancelled") {
        return "Cancelled";
    }

    if (booking && booking.status === "boarding") {
        return "Boarding";
    }

    if (booking && booking.status === "waiting") {
        return "Waiting";
    }

    return booking ? "Departed" : "No Active Booking";
}


function getStatusClass(status) {
    switch (status) {
        case "Boarding":
            return "status-boarding";
        case "Departed":
        case "Completed":
            return "status-completed";
        case "Cancelled":
            return "status-cancelled";
        case "Waiting":
            return "status-waiting";
        default:
            return "status-completed";
    }
}


function escapeRouteText(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}


function formatTimer(seconds) {
    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}


function getQueueRemainingSeconds(queue) {
    const elapsedSeconds = Math.floor(
        (Date.now() - Number(queue.timerStartedAt)) / 1000
    );

    return Math.max(0, Number(queue.timerDuration) - elapsedSeconds);
}

function getEstimatedDeparture(queue) {
    if (!queue) {
        return "";
    }

    const timerEndsAt = Number(queue.timerStartedAt) +
        Number(queue.timerDuration) * 1000;
    const collectionMinutes = queue.status === "waiting"
        ? (isFull(queue.totalSeats) ? FULL_QUEUE_BOARDING_MINUTES : COLLECTION_BOARDING_MINUTES)
        : 0;
    const departure = new Date(timerEndsAt + collectionMinutes * 60 * 1000);

    if (!Number.isFinite(departure.getTime())) {
        return "";
    }

    return departure.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit"
    });
}


function getBookingQueuePassengerCount(booking, activeQueue) {
    if (activeQueue) {
        return getQueueBookingCount(activeQueue.id);
    }

    if (!booking) {
        return 0;
    }

    return getQueueBookingCount(booking.queueId);
}


function updateActiveRoutes() {
    const routesContainer = document.getElementById("activeRoutes");

    if (!routesContainer) {
        return;
    }

    const queues = getActiveQueues();

    if (queues.length === 0) {
        routesContainer.innerHTML = `
            <p class="active-routes-empty">There are no active routes right now.</p>
        `;
        return;
    }

    routesContainer.innerHTML = queues.map((queue) => {
        const status = queue.status === "boarding" ? "Boarding" : "Waiting";
        const queueDestinations = [...new Set(getQueueBookings(queue.id)
            .map((bookingItem) => bookingItem.destinationLabel || bookingItem.destination)
            .filter(Boolean))];

        return `
            <article class="active-route">
                <div class="active-route-heading">
                    <h3>${escapeRouteText(queue.station)}</h3>
                    <span class="status-badge ${getStatusClass(status)}">${status}</span>
                </div>
                <div class="active-route-meta">
                    <span>Passengers: ${getQueueBookingCount(queue.id)} / ${Number(queue.maxSeats) || 6}</span>
                    <span>Time remaining: ${formatTimer(getQueueRemainingSeconds(queue))}</span>
                </div>
                ${queueDestinations.length
                    ? `<p class="active-route-destinations">Destinations: ${queueDestinations.map(escapeRouteText).join(", ")}</p>`
                    : ""}
            </article>
        `;
    }).join("");
}


function updateTripPage() {
    const booking = getCurrentBooking();
    const tripItems = document.querySelectorAll(".trip-item");

    if (tripItems.length < 6) {
        updateActiveRoutes();
        return;
    }

    const activeQueue = booking ? getActiveQueue(booking.queueId) : null;
    const stationText = tripItems[1].querySelector("p");
    const destinationText = tripItems[2].querySelector("p");
    const seatsText = tripItems[3].querySelector("p");
    const departureText = tripItems[4].querySelector("p");
    const estimatedDepartureText = document.getElementById("estimatedDeparture");
    const statusText = tripItems[5].querySelector("span");

    if (tripItems[0]) {
        const queueIdText = tripItems[0].querySelector("p");
        if (queueIdText) {
            queueIdText.textContent = booking
                ? booking.queueId || "Not recorded"
                : "No active queue";
        }
    }

    if (stationText) {
        stationText.textContent = activeQueue
            ? activeQueue.station
            : booking ? booking.station : "No active trip";
    }

    if (destinationText) {
        destinationText.textContent = booking
            ? booking.destinationLabel || booking.destination
            : "No active trip";
    }

    if (seatsText) {
        const passengerCount =
            getBookingQueuePassengerCount(booking, activeQueue);
        const maxSeats =
            activeQueue ? Number(activeQueue.maxSeats) || 6 : 6;

        seatsText.textContent =
            `${passengerCount}/${maxSeats}`;
    }

    if (departureText) {
        const timerText = departureText.querySelector("[data-trip-timer]");
        if (!activeQueue || !booking) {
            const noTripText = booking && booking.status === "completed"
                ? "Departed"
                : "No active trip";
            if (timerText) {
                timerText.textContent = noTripText;
            } else {
                departureText.textContent = noTripText;
            }
            if (estimatedDepartureText) {
                estimatedDepartureText.textContent = booking && booking.status === "completed"
                    ? "Trip completed"
                    : "Estimated departure unavailable";
            }
        } else {
            if (timerText) {
                timerText.textContent = formatTimer(getQueueRemainingSeconds(activeQueue));
            } else {
                departureText.textContent = formatTimer(getQueueRemainingSeconds(activeQueue));
            }
            const estimate = getEstimatedDeparture(activeQueue);
            if (estimatedDepartureText) {
                estimatedDepartureText.textContent = estimate
                    ? `Estimated departure · ${estimate}`
                    : "Estimated departure unavailable";
            }
        }
    }

    if (statusText) {
        const status = getBookingStatus(booking, activeQueue);
        statusText.textContent = status;
        statusText.className = `status-badge ${getStatusClass(status)}`;
    }

    const progressStages = document.querySelectorAll("[data-trip-stage]");
    if (progressStages.length > 0) {
        const status = getBookingStatus(booking, activeQueue);
        const activeStage = status === "Waiting"
            ? "waiting"
            : status === "Boarding"
                ? "boarding"
                : status === "Departed" || status === "Completed"
                    ? "completed"
                    : "";
        const stageOrder = ["waiting", "boarding", "completed"];
        const activeIndex = stageOrder.indexOf(activeStage);

        progressStages.forEach((stage) => {
            const stageIndex = stageOrder.indexOf(stage.dataset.tripStage);
            stage.classList.toggle("is-complete", activeIndex >= 0 && stageIndex < activeIndex);
            stage.classList.toggle("is-current", stage.dataset.tripStage === activeStage);
        });
    }

    const routeOrigin = document.getElementById("tripOriginLabel");
    const routeDestination = document.getElementById("tripDestinationLabel");
    if (routeOrigin) {
        routeOrigin.textContent = booking ? booking.station : "Pickup";
    }
    if (routeDestination) {
        routeDestination.textContent = booking
            ? booking.destinationLabel || booking.destination
            : "Drop-off";
    }

    updateActiveRoutes();
}


document.addEventListener(
    "DOMContentLoaded",
    updateTripPage
);
