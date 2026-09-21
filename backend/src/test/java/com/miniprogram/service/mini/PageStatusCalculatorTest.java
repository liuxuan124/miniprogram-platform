package com.miniprogram.service.mini;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PageStatusCalculatorTest {

    @Test
    void archivedWins() {
        assertEquals("archived", PageStatusCalculator.calculate(1, 2, 3, true));
        assertEquals("archived", PageStatusCalculator.calculate(2, 0, 0, 1));
    }

    @Test
    void offline() {
        assertEquals("offline", PageStatusCalculator.calculate(2, 1, 1, false));
    }

    @Test
    void draftNeverPublished() {
        assertEquals("draft", PageStatusCalculator.calculate(0, 0, 1, false));
        assertEquals("draft", PageStatusCalculator.calculate(0, 0, 0, false));
        assertEquals("draft", PageStatusCalculator.calculate(1, 0, 1, false));
    }

    @Test
    void pendingAndLive() {
        assertEquals("pending", PageStatusCalculator.calculate(1, 1, 2, false));
        assertEquals("live", PageStatusCalculator.calculate(1, 2, 2, false));
        assertEquals("live", PageStatusCalculator.calculate(1, 2, 1, false));
    }
}
