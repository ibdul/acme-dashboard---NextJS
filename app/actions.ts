'use server'

import { sql } from '@vercel/postgres'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const FormSchema = z.object({
  id : z.string(),
  customerID : z.string(),
  amount : z.coerce.number(),
  status : z.enum(['pending', 'paid']),
  date: z.string()
})

const CreateInvoiceFormSchema = FormSchema.omit({id:true, date:true})

export async function createInvoice(formData: FormData) {
    const {customerID,  amount, status } = CreateInvoiceFormSchema.parse({
    customerID : formData.get("customerId"),
    amount : formData.get("amount"),
    status : formData.get("status"),
  })
  const amountInCents = amount*100;
  const date = new Date().toISOString().split("T")[0]

  try {
    await sql`
      INSERT INTO invoices (customerId, amount, status, date)
      VALUES (${customerID}, ${amountInCents}, ${status}, ${date})
    `
  }
  catch (error){
    return {message:"DB ERROR: Unable to create invoice"}
  }
  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices")
}


const UpdateInvoiceFormSchema = FormSchema.omit({id:true, date:true})
export async function updateInvoice(id:string,formData: FormData) {
  const {customerID, amount, status } = UpdateInvoiceFormSchema.parse({
    customerID : formData.get("customerId"),
    amount : formData.get("amount"),
    status : formData.get("status"),
  })

  const amountInCents = amount*100;

  try {
    await sql`
      UPDATE invoices 
      set customerId = ${customerID}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `
  }
  catch (error){
    return {message:"DB ERROR: Unable to edit invoice"}
  }
  revalidatePath("/dashboard/invoices")
  redirect("/dashboard/invoices")
}

export async function deleteInvoice(id:string) {
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`
    revalidatePath("/dashboard/invoices")
    return {message:"Delete Invoice"}
  }
  catch (error) {
    return {message: "DB ERROR: Unable to delete Invoice"}
  }
}
