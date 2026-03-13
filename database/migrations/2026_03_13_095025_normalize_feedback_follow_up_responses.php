<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Rename 'comment' key to 'freeText' in follow_up_responses JSON
        $feedbacks = DB::table('feedbacks')
            ->whereNotNull('follow_up_responses')
            ->get();

        foreach ($feedbacks as $feedback) {
            $responses = json_decode($feedback->follow_up_responses, true);
            if ($responses && isset($responses['comment']) && !isset($responses['freeText'])) {
                $responses['freeText'] = $responses['comment'];
                unset($responses['comment']);
                DB::table('feedbacks')
                    ->where('id', $feedback->id)
                    ->update(['follow_up_responses' => json_encode($responses)]);
            }
        }
    }

    public function down(): void
    {
        $feedbacks = DB::table('feedbacks')
            ->whereNotNull('follow_up_responses')
            ->get();

        foreach ($feedbacks as $feedback) {
            $responses = json_decode($feedback->follow_up_responses, true);
            if ($responses && isset($responses['freeText']) && !isset($responses['comment'])) {
                $responses['comment'] = $responses['freeText'];
                unset($responses['freeText']);
                DB::table('feedbacks')
                    ->where('id', $feedback->id)
                    ->update(['follow_up_responses' => json_encode($responses)]);
            }
        }
    }
};
