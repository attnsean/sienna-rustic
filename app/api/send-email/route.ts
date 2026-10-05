import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ujiqdozsipxwjrugtsgd.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_publishable_jfhrpcWLhECHJEnE1AhiaQ_zgDT7D4R";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Initialize Nodemailer transporter with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "digital.invitation.serastory@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD || "nqkgousxavucqsbm",
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const guestEmail = (body.email || "").trim();
    const guestPhone = (body.phone || body.guestPhone || "").trim();
    const name = (body.name || body.guestName || "").trim();
    const attendance = body.attendance || "Hadir";
    const pax = body.pax ?? 1;
    const brideName = body.brideName || "Ira";
    const groomName = body.groomName || "Faisal";
    const weddingDate = body.weddingDate;
    const venueName = body.venueName || "Joglo Bumi Salika";
    const venueAddress = body.venueAddress || "";
    const notes = body.notes || body.message || "";
    const projectId = body.projectId || body.project_id || process.env.NEXT_PUBLIC_PROJECT_ID;

    if (!name) {
      return NextResponse.json({ error: "Missing guest name" }, { status: 400 });
    }

    let formattedWeddingDate = "19 September 2026";
    if (weddingDate) {
      try {
        const date = new Date(weddingDate);
        if (!isNaN(date.getTime())) {
          formattedWeddingDate = date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // 1. Resolve Host Email (the couple / project owner)
    let hostEmail = (body.hostEmail || "").trim();
    if (!hostEmail && projectId) {
      try {
        const { data: proj } = await supabaseAdmin
          .from("projects")
          .select("user_id")
          .eq("id", projectId)
          .single();

        if (proj?.user_id) {
          const { data: prof } = await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", proj.user_id)
            .single();

          if (prof?.email) {
            hostEmail = prof.email;
          }
        }
      } catch (err) {
        console.error("Failed to query host email:", err);
      }
    }

    // Fallback host email if project belongs to Ira Faisal
    if (!hostEmail && (projectId === "c5fba29d-bb11-43f8-8586-8591a1f7fe18" || brideName.toLowerCase().includes("ira"))) {
      hostEmail = "iranazizah18@gmail.com";
    }

    let guestEmailSent = false;
    let hostEmailSent = false;

    // 2. Send Confirmation to Guest if guest email is provided
    if (guestEmail && guestEmail.includes("@")) {
      try {
        const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(name)}&size=250&ecLevel=H`;
        const guestMailOptions = {
          from: `"${groomName} & ${brideName} Wedding" <${process.env.GMAIL_USER || "digital.invitation.serastory@gmail.com"}>`,
          to: guestEmail,
          subject: `RSVP Confirmation - ${groomName} & ${brideName} Wedding`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #eaeaea; border-radius: 20px; background-color: #ffffff;">
              <h1 style="text-align: center; color: #1a1a1a; letter-spacing: 2px; font-weight: 300; font-size: 26px; margin-bottom: 8px;">${groomName.toUpperCase()} &amp; ${brideName.toUpperCase()}</h1>
              <div style="height: 1px; background: #c5a059; width: 80px; margin: 16px auto 24px auto;"></div>
              
              <p style="font-size: 16px; color: #444; line-height: 1.6; text-align: center; margin-bottom: 12px;">
                Dear <strong>${name}</strong>,
              </p>
              
              <p style="font-size: 14px; color: #666; line-height: 1.6; text-align: center; margin-bottom: 28px;">
                Terima kasih telah melakukan konfirmasi kehadiran pernikahan kami. Kami sangat menantikan kehadiran Anda untuk merayakan hari bahagia ini bersama kami.
              </p>
              
              <div style="text-align: center; margin: 24px 0; background: #fdfbf7; border-radius: 16px; overflow: hidden; border: 1px solid #e8e1d5; padding: 24px;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #8c734b; font-weight: 700; margin-bottom: 12px;">RSVP CONFIRMED</p>
                <h2 style="margin: 0 0 12px 0; font-weight: bold; color: #1a1a1a; letter-spacing: 1px; font-size: 22px;">${name.toUpperCase()}</h2>
                
                <div style="margin: 16px auto; width: 140px; height: 140px; background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                  <img src="${qrCodeUrl}" alt="QR Ticket" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>

                <div style="display: inline-block; text-align: left; margin-top: 12px; font-size: 13px; color: #555; line-height: 1.8;">
                  <div><strong>Status:</strong> ${attendance}</div>
                  <div><strong>Jumlah Tamu:</strong> ${pax} Orang</div>
                  <div><strong>Waktu Acara:</strong> ${formattedWeddingDate}</div>
                  <div><strong>Lokasi:</strong> ${venueName}</div>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 32px; font-size: 12px; color: #999;">
                <p style="margin: 0 0 4px 0;">${formattedWeddingDate} &bull; ${venueName}</p>
                <p style="margin: 0; font-size: 11px;">&copy; ${new Date().getFullYear()} SERASTORY. All rights reserved.</p>
              </div>
            </div>
          `,
        };
        await transporter.sendMail(guestMailOptions);
        guestEmailSent = true;
      } catch (guestErr) {
        console.error("Failed sending email to guest:", guestErr);
      }
    }

    // 3. Send Notification to Couple / Host
    if (hostEmail && hostEmail.includes("@")) {
      try {
        const hostMailOptions = {
          from: `"SERASTORY RSVP Alert" <${process.env.GMAIL_USER || "digital.invitation.serastory@gmail.com"}>`,
          to: hostEmail,
          subject: `🔔 Konfirmasi RSVP Baru: ${name} (${attendance}) - ${groomName} & ${brideName}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">RSVP Baru Masuk</span>
                <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 22px;">${groomName} &amp; ${brideName}</h2>
                <p style="color: #64748b; font-size: 13px; margin: 0;">Sistem Undangan Digital SERASTORY</p>
              </div>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size: 15px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Rincian Konfirmasi Tamu:</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; width: 140px; color: #64748b; font-weight: 500;">Nama Tamu</td>
                    <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Status Kehadiran</td>
                    <td style="padding: 6px 0;">
                      <span style="display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; ${attendance.toLowerCase().includes("hadir") && !attendance.toLowerCase().includes("tidak") ? "background: #dcfce7; color: #15803d;" : "background: #fee2e2; color: #b91c1c;"}">
                        ${attendance}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Jumlah Pax</td>
                    <td style="padding: 6px 0; font-weight: 600;">${pax} Orang</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">WhatsApp / No. HP</td>
                    <td style="padding: 6px 0;">${guestPhone || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Email Tamu</td>
                    <td style="padding: 6px 0;">${guestEmail || "-"}</td>
                  </tr>
                  ${notes ? `
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500; vertical-align: top;">Catatan / Doa</td>
                    <td style="padding: 6px 0; color: #334155;">${notes}</td>
                  </tr>
                  ` : ""}
                  <tr>
                    <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Waktu Submit</td>
                    <td style="padding: 6px 0; font-size: 12px; color: #64748b;">${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                <p style="margin: 0;">Anda menerima email ini sebagai pemilik undangan pernikahan <strong>${groomName} &amp; ${brideName}</strong> di SERASTORY.</p>
              </div>
            </div>
          `,
        };
        await transporter.sendMail(hostMailOptions);
        hostEmailSent = true;
      } catch (hostErr) {
        console.error("Failed sending email to host:", hostErr);
      }
    }

    return NextResponse.json({
      success: true,
      guestEmailSent,
      hostEmailSent,
      hostEmail: hostEmail ? `${hostEmail.slice(0, 3)}***@${hostEmail.split("@")[1]}` : null
    });
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
