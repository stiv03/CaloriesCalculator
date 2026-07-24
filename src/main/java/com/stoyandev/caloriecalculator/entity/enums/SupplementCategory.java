package com.stoyandev.caloriecalculator.entity.enums;

/**
 * Schedule type for a supplement, used to decide which days it is "due".
 * DAILY and SLEEP supplements are due every day; PREWORKOUT supplements are
 * due only on days with a logged workout (excluded on rest / non-workout days).
 */
public enum SupplementCategory {
    DAILY,
    PREWORKOUT,
    SLEEP
}
