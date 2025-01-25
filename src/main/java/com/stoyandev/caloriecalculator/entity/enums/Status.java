package com.stoyandev.caloriecalculator.entity.enums;

public enum Status {
    NORMAL_BULK(1),
    SLOW_BULK(2),
    FAST_BULK(3),
    NORMAL_CUT(4),
    SLOW_CUT(5),
    FAST_CUT(6),
    MAINTAINING(7);

    private final int code;

    Status(int code) {
        this.code = code;
    }

    public int getCode() {
        return code;
    }

    public static Status fromCode(int code) {
        for (Status status : Status.values()) {
            if (status.getCode() == code) {
                return status;
            }
        }
        throw new IllegalArgumentException("Invalid code for Status: " + code);
    }
}


