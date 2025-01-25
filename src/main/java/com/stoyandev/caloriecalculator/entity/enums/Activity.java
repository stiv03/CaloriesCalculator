package com.stoyandev.caloriecalculator.entity.enums;

public enum Activity {
    MINIMAL(1),
    LOW(2),
    NORMAL(3),
    HIGH(4),
    VERY_HIGH(5);

    private final int code;

    Activity(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static Activity fromCode(int code) {
        for (Activity activity : Activity.values()) {
            if (activity.getCode() == code) {
                return activity;
            }
        }
        throw new IllegalArgumentException("Invalid code for Activity: " + code);
    }
}