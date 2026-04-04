const submit = async () => {
  if (!audioBlob || !name) {
    setStatus("Missing name or recording ❌");
    return;
  }

  try {
    setStatus("Uploading...");

    const fileName = `${Date.now()}-${name}.webm`;

    // Upload to Supabase Storage
    const uploadRes = await supabase.storage
      .from("Student-audio")
      .upload(fileName, audioBlob);

    if (uploadRes.error) {
      console.error("UPLOAD ERROR:", uploadRes.error);
      setStatus("Upload failed ❌");
      return;
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("Student-audio")
      .getPublicUrl(fileName);

    const audioUrl = publicData.publicUrl;

    setStatus("Saving...");

    // Insert into database
    const insert = await supabase
      .from("student_submissions")
      .insert({
        student_name: name,
        audio_url: audioUrl,
        prompt_text: "Describe your work skills in 1 minute",
      })
      .select()
      .single();

    if (insert.error || !insert.data) {
      console.error("INSERT ERROR:", insert.error);
      setStatus("Insert failed ❌");
      return;
    }

    setStatus("Analyzing...");

    // Call AI
    const ai = await analyzeSubmission(
      audioUrl,
      "Describe your work skills in 1 minute"
    );

    if (!ai) {
      setStatus("AI failed ❌");
      return;
    }

    // Update record with AI results
    const update = await supabase
      .from("student_submissions")
      .update({
        transcript: ai.transcript,
        ai_score: ai.score,
        ai_comment: ai.comment,
      })
      .eq("id", insert.data.id);

    if (update.error) {
      console.error("UPDATE ERROR:", update.error);
      setStatus("Update failed ❌");
      return;
    }

    setStatus("Done ✅");

  } catch (err) {
    console.error("UNEXPECTED ERROR:", err);
    setStatus("Something broke ❌");
  }
};
