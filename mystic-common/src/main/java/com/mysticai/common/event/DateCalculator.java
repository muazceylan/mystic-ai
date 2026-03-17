/*
package com.mysticai.common.event;

  */
/*  Implement a function that calculates the date after a given number of days. The input to the function wil be a
    string in the format "YYYY-MM-DD" and a positive integer 'days' representing the days to add.
    The output should be a string in the same "YYYY-MM-DD" format representing the new date.

    The function should correctly handle leap years and not use any built-in date libraries.
            Example: dateAfterDays("2021-12-01", 10) = "2021-12-11"
*//*



public  final  class DateCalculator {


    DateCalculator() {
    }
   public static void main(String[] args){


       System.out.println( addToDay("2023-11-13",233) ) ;
   }

    private static String addToDay(String date, int addDay){


        validateInput(addDay,date);


        ParsedDay parsedDay = new ParsedDay(date);
        int day = parsedDay.day;
        int month = parsedDay.month;
        int year = parsedDay.year;

        validateDate(year,month,day);

        while (addDay > 0){

           day ++;

           if(day >  getDayOfMonth(month,year)){

                day = 1;
                month ++;
                if(month > 12){
                   month = 1;
                   year ++;
                }

           }
           addDay --;

        }
        return  String.format("%04d-%02d-%02d",year,month,day);
    }
    private static int getDayOfMonth(int month, int year){

        switch (month){
            case 1:
            case 3:
            case 5:
            case 7:
            case 8:
            case 10:
            case 12:
                return 31;
            case 2: return  isLeapYear(year) ? 29 : 28;

            default: return  30;
        }

    }
    private  static boolean isLeapYear(int year){

        return year % 400 == 0 || (year % 100 != 0 && year % 4 == 0);
    }
    private static class ParsedDay{

        int day;
        int month;
        int year;

      private  ParsedDay(String date){

            this.year = Integer.parseInt(date.substring(0,4));
            this.month = Integer.parseInt(date.substring(5,7));
            this.day = Integer.parseInt(date.substring(8,10));
        }

    }
    private static void validateDate(int year, int month, int day) {
        if (year <= 0) {
            throw new IllegalArgumentException("Year must be greater than 0");
        }
        if (month < 1 || month > 12) {
            throw new IllegalArgumentException("Month must be between 1 and 12");
        }

        int maxDay = getDayOfMonth(month, year);
        if (day < 1 || day > maxDay) {
            throw new IllegalArgumentException(
                    "Day must be between 1 and " + maxDay + " for " + year + "-" + month
            );
        }
    }
    private static boolean validateInput(Integer daysToAdd,String date){
        if (date == null || date.length() != 10) {
            throw new IllegalArgumentException("Date must be in YYYY-MM-DD format");
        }
        if (daysToAdd < 0) {
            throw new IllegalArgumentException("daysToAdd must be a positive integer or zero");
        }
    }
}
*/
