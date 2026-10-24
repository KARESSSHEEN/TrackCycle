const MAX_SEATS = 6;

const NORMAL_DEPARTURE_MINUTES = 15;
const FULL_QUEUE_BOARDING_MINUTES = 5;
const COLLECTION_BOARDING_MINUTES = 3;


/* ================= SEATS ================= */

function getAvailableSeats(bookedSeats) {

    const seats =
        Number(bookedSeats) || 0;

    return Math.max(
        0,
        MAX_SEATS - seats
    );
}


/* ================= FULL CHECK ================= */

function isFull(bookedSeats) {

    return Number(bookedSeats) >= MAX_SEATS;
}


/* ================= CREATE QUEUE ================= */

function createActiveQueue(station) {

    const now =
        Date.now();

    return {

        id:
            `QUEUE-${now}-${Math.random().toString(36).slice(2, 8)}`,

        station:
            station,

        totalSeats:
            0,

        maxSeats:
            MAX_SEATS,

        queueSchemaVersion:
            2,

        status:
            "waiting",

        timerStartedAt:
            now,

        timerDuration:
            NORMAL_DEPARTURE_MINUTES * 60,

        createdAt:
            now

    };
}


/* ================= ADD SEATS ================= */

function addSeatsToQueue(
    queue,
    seats
) {

    if (
        !queue ||
        (queue.status !== "waiting" && queue.status !== "boarding")
    ) {
        return 0;
    }

    const requestedSeats =
        Number(seats) || 0;

    if (!Number.isInteger(requestedSeats) || requestedSeats < 1) {
        return 0;
    }

    const availableSeats =
        getAvailableSeats(
            queue.totalSeats
        );

    const seatsToAdd =
        Math.min(
            requestedSeats,
            availableSeats
        );

    queue.totalSeats +=
        seatsToAdd;

    return seatsToAdd;
}


/* ================= START BOARDING ================= */

function startBoardingTimer(queue) {
    if (!queue || queue.status !== "waiting") {
        return queue;
    }

    queue.status =
        "boarding";

    queue.timerDuration =
        (isFull(queue.totalSeats)
            ? FULL_QUEUE_BOARDING_MINUTES
            : COLLECTION_BOARDING_MINUTES) * 60;

    queue.timerStartedAt =
        Date.now();


    return queue;
}


/* ================= COMPLETE QUEUE ================= */

function completeActiveQueue(queue) {

    if (!queue) {
        return null;
    }


    queue.status =
        "completed";

    queue.completedAt =
        Date.now();


    return queue;
}